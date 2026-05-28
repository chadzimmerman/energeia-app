import { supabase } from "@/utils/supabase";
import { grantAchievement } from "@/utils/grantAchievement";
import { resolveItemImage, resolveCharacterSetImage } from "@/utils/resolveItemImage";
import { getCurrentSeason } from "@/utils/seasons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Import for Icons (using FontAwesome for UI clarity, assuming it's available)
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Assuming View and Text from Themed are used for potential theme support
import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
// Import Colors for UI consistency
import Colors from "@/constants/Colors";

// --- TYPES & CONSTANTS ---

const SEASON_LABELS: Record<string, string> = {
  winter: "Winter (Dec–Feb)",
  spring: "Spring (Mar–May)",
  summer: "Summer (Jun–Aug)",
  autumn: "Autumn (Sep–Nov)",
};

const SEASON_DIALOGUE: Record<string, string> = {
  winter: "The cold has come, but the market fire burns bright. The winter collection awaits.",
  spring: "The thaw brings new wares from distant lands. Browse the spring collection.",
  summer: "The longest days bring the richest goods. See what the summer has brought.",
  autumn: "The harvest is in. Come, see what the season has brought to market.",
};

interface CharacterSetGroup {
  setGroup: string;
  isBaseClass: boolean;
  season: string | null;
  items: MarketItem[];
}

interface MarketItem {
  id: string;
  name: string;
  imageSource: ReturnType<typeof resolveItemImage>;
  price: number;
  isLocked: boolean;
  lockedReason: string | null;
  isSubscriberOnly: boolean;
  type: "consumable" | "equippable";
  display_slot: string | null;
  flavorText: string;
  description: string;
  season: string | null;
  hiddenBonus: {
    stat: "energeia" | "defense" | "health" | "currency";
    buff: number;
  };
  set_group: string | null;
  stage_order: number | null;
  prerequisite_set_group: string | null;
}

const STAT_LABELS: Record<string, string> = {
  health: "Max Health",
  energeia: "Bonus XP per Habit",
  currency: "Energeia Earned",
};

// Get screen width to calculate responsive card size (for 2 columns with padding)
const screenWidth = Dimensions.get("window").width;
const cardPadding = 15; // Padding around the grid
const cardGap = 10; // Gap between cards
// Calculate card size for 2 columns: (Screen Width - Total Side Padding - Gap between cards) / 2
const cardSize = (screenWidth - cardPadding * 2 - cardGap) / 2;

// --- COMPONENTS ---

/**
 * Renders the modal that pops up when an item is clicked, focused on buying.
 */
const MarketDetailsModal: React.FC<{
  isVisible: boolean;
  item: MarketItem | null;
  onClose: () => void;
  playerEnergeia: number;
  userId: string | null;
  onPurchaseSuccess: () => void;
}> = ({
  isVisible,
  item,
  onClose,
  playerEnergeia,
  userId,
  onPurchaseSuccess,
}) => {
  if (!item) return null;

  const canAfford = playerEnergeia >= item.price;

  const handleBuy = async () => {
    if (item.isLocked) {
      alert("Locked: " + (item.lockedReason ?? "Complete prerequisites first."));
      return;
    }

    console.log("Starting purchase...");

    try {
      // 1. Add to inventory — character_set upgrades replace the existing stage row
      //    so the inventory stays at one entry per set_group instead of accumulating.
      if (item.display_slot === "character_set" && item.set_group) {
        const { data: groupItems } = await supabase
          .from("items_master")
          .select("id")
          .eq("set_group", item.set_group);
        const groupIds = (groupItems ?? []).map((i: any) => i.id);

        const { data: existingRow } = await supabase
          .from("user_inventory")
          .select("id")
          .eq("user_id", userId)
          .in("item_master_id", groupIds)
          .maybeSingle();

        if (existingRow) {
          const { error: updateErr } = await supabase
            .from("user_inventory")
            .update({ item_master_id: item.id })
            .eq("id", existingRow.id);
          if (updateErr) {
            console.error("INVENTORY ERROR:", updateErr.message);
            alert("Inventory Error: " + updateErr.message);
            return;
          }
        } else {
          const { error: insertErr } = await supabase
            .from("user_inventory")
            .insert({ user_id: userId, item_master_id: item.id });
          if (insertErr) {
            console.error("INVENTORY ERROR:", insertErr.message);
            alert("Inventory Error: " + insertErr.message);
            return;
          }
        }
      } else {
        const { error: invError } = await supabase
          .from("user_inventory")
          .insert({ user_id: userId, item_master_id: item.id });
        if (invError) {
          console.error("INVENTORY ERROR:", invError.message);
          alert("Inventory Error: " + invError.message);
          return;
        }
      }

      console.log("Item added to inventory table.");

      // 2. Deduct from currency wallet (not the XP bar)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ energeia_currency: playerEnergeia - item.price })
        .eq("id", userId);

      if (profileError) {
        console.error("PROFILE ERROR:", profileError.message);
        alert("Currency Error: " + profileError.message);
        return;
      }

      console.log("Money deducted successfully.");

      // 3. Achievement grants
      if (userId) {
        if (item.type === "equippable") grantAchievement(userId, "first_weapon");
        if (item.display_slot === "wall") grantAchievement(userId, "first_icon");

        // Collection achievements — check if user now owns everything in a category
        const { data: allInv } = await supabase
          .from("user_inventory")
          .select("item_master_id")
          .eq("user_id", userId);
        const ownedIds = new Set((allInv ?? []).map((r: any) => r.item_master_id));
        ownedIds.add(item.id); // include the just-purchased item

        // all_icons: own every wall-slot item
        const { data: allIcons } = await supabase.from("items_master").select("id").eq("display_slot", "wall");
        if (allIcons && allIcons.length > 0 && allIcons.every((i: any) => ownedIds.has(i.id)))
          grantAchievement(userId, "all_icons");

        // all_items: own every market item
        const { data: allItems } = await supabase.from("items_master").select("id").eq("is_in_market", true);
        if (allItems && allItems.length > 0 && allItems.every((i: any) => ownedIds.has(i.id)))
          grantAchievement(userId, "all_items");

        // Seasonal gear achievements
        const seasonMap: Record<string, string> = {
          "Winter (Dec–Feb)": "all_winter_gear",
          "Spring (Mar–May)": "all_spring_gear",
          "Summer (Jun–Aug)": "all_summer_gear",
          "Autumn (Sep–Nov)": "all_autumn_gear",
        };
        for (const [season, achievementId] of Object.entries(seasonMap)) {
          const { data: seasonItems } = await supabase.from("items_master").select("id").eq("season", season);
          if (seasonItems && seasonItems.length > 0 && seasonItems.every((i: any) => ownedIds.has(i.id)))
            grantAchievement(userId, achievementId);
        }

        // all_year_gear: own every seasonal item across all seasons
        const { data: allSeasonalItems } = await supabase.from("items_master").select("id").not("season", "is", null);
        if (allSeasonalItems && allSeasonalItems.length > 0 && allSeasonalItems.every((i: any) => ownedIds.has(i.id)))
          grantAchievement(userId, "all_year_gear");
      }

      // 4. Success
      onPurchaseSuccess();
      onClose();
      alert("Purchase Successful!");
    } catch (err: any) {
      console.error("CATCH ERROR:", err);
      alert("System Error: " + err.message);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Background Dimmer/Overlay - Clicking this calls onClose */}
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose} // Close the modal when touching the background
      >
        {/* Modal Content - Stop propagation to prevent closing when pressing inside the card */}
        <ThemedView
          style={modalStyles.modalView}
          onStartShouldSetResponder={() => true}
        >
          {/* Close Button */}
          <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
            <FontAwesome name="times" size={24} color={Colors.light.tint} />
          </TouchableOpacity>

          {/* Top Currency Display (Player's Current Energeia) */}
          <View style={modalStyles.currencyDisplay}>
            <View style={modalStyles.currencyChip}>
              <FontAwesome name="flash" size={16} color="#FFC800" />
              <Text style={modalStyles.currencyText}>{playerEnergeia}</Text>
            </View>
          </View>

          {/* Item Image */}
          <Image
            source={item.imageSource}
            style={modalStyles.itemImage}
            resizeMode="contain"
          />

          {/* Item Name */}
          <ThemedText style={modalStyles.itemName}>{item.name}</ThemedText>

          {/* Flavor Text and Description */}
          <ThemedText style={modalStyles.itemFlavorText}>
            {item.flavorText}
          </ThemedText>
          <ThemedText style={modalStyles.itemDescription}>
            {item.description}
          </ThemedText>

          {item.hiddenBonus.buff > 0 && (
            <View style={modalStyles.hiddenBonusBox}>
              <ThemedText style={modalStyles.hiddenBonusText}>
                +{item.hiddenBonus.buff} {STAT_LABELS[item.hiddenBonus.stat] ?? item.hiddenBonus.stat} when equipped
              </ThemedText>
            </View>
          )}

          {/* Lock reason banner */}
          {item.isLocked && item.lockedReason && (
            <View style={modalStyles.lockedBanner}>
              <FontAwesome name="lock" size={13} color="#C0392B" />
              <ThemedText style={modalStyles.lockedBannerText}>{item.lockedReason}</ThemedText>
            </View>
          )}

          {/* Action Button: BUY */}
          <TouchableOpacity
            style={[
              modalStyles.buyButton,
              (!canAfford || item.isLocked || item.isSubscriberOnly) && modalStyles.disabledButton,
            ]}
            onPress={handleBuy}
            disabled={!canAfford || item.isLocked || item.isSubscriberOnly}
          >
            <Text style={modalStyles.buyButtonText}>
              {item.isSubscriberOnly ? "SUBSCRIBERS ONLY" : item.isLocked ? "LOCKED" : canAfford ? "BUY" : "CANNOT AFFORD"}
            </Text>
            {/* Price Tag */}
            <View style={modalStyles.priceTag}>
              <FontAwesome name="flash" size={14} color="#A06E00" />
              <Text style={modalStyles.priceTagText}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Renders a single item card with its image, price, and lock status.
 */
const MarketItemCard: React.FC<{
  item: MarketItem;
  onPress: (item: MarketItem) => void;
}> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        marketStyles.itemCard,
        { width: cardSize, height: cardSize * 1.4 }, // Adjusted height for market
        item.isLocked && marketStyles.lockedCard,
      ]}
      onPress={() => onPress(item)} // Open modal on press
      activeOpacity={0.7}
      // Locked items can still be tapped so the modal shows the lock reason
    >
      <Image
        source={item.imageSource}
        style={marketStyles.itemImage}
        resizeMode="contain"
      />

      {/* Item Name */}
      <Text style={marketStyles.itemName}>{item.name}</Text>

      {/* Item Price */}
      <ThemedView style={marketStyles.priceContainer}>
        {/* Energeia Icon - using FontAwesome flash icon */}
        <FontAwesome name="flash" size={12} color="#A06E00" />
        <ThemedText style={marketStyles.priceText}>{item.price}</ThemedText>
      </ThemedView>

      {/* Subscriber badge */}
      {item.isSubscriberOnly && (
        <View style={marketStyles.subscriberBadge}>
          <FontAwesome name="star" size={9} color="#fff" />
          <Text style={marketStyles.subscriberBadgeText}>SUB</Text>
        </View>
      )}

      {/* Lock Overlay (if locked) */}
      {(item.isLocked || item.isSubscriberOnly) && (
        <View style={marketStyles.lockOverlay}>
          <FontAwesome name={item.isSubscriberOnly ? "star" : "lock"} size={40} color="rgba(0,0,0,0.5)" />
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Horizontal row of stage cards for one character set group.
 * Stages are shown in purchase order with arrows between them.
 * Locked stages are dimmed but still tappable to show the lock reason.
 */
const CharacterSetGroupRow: React.FC<{
  group: CharacterSetGroup;
  onPress: (item: MarketItem) => void;
}> = ({ group, onPress }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    nestedScrollEnabled
    contentContainerStyle={marketStyles.charSetRow}
  >
    {group.items.map((item, index) => (
      <React.Fragment key={item.id}>
        {index > 0 && <Text style={marketStyles.stageArrow}>→</Text>}
        <TouchableOpacity
          style={[marketStyles.stageCard, item.isLocked && marketStyles.stageCardLocked]}
          onPress={() => onPress(item)}
          activeOpacity={0.75}
        >
          <Image source={item.imageSource} style={marketStyles.stageCardImage} resizeMode="contain" />
          <Text style={marketStyles.stageCardName} numberOfLines={2}>{item.name}</Text>
          {item.hiddenBonus.buff > 0 && (
            <Text style={marketStyles.stageCardBonus}>
              +{item.hiddenBonus.buff} {STAT_LABELS[item.hiddenBonus.stat] ?? item.hiddenBonus.stat}
            </Text>
          )}
          <View style={marketStyles.stageCardPrice}>
            <FontAwesome
              name={item.isLocked ? "lock" : "flash"}
              size={11}
              color={item.isLocked ? "#999" : "#A06E00"}
            />
            <Text style={[
              marketStyles.stageCardPriceText,
              item.isLocked && marketStyles.stageCardPriceTextLocked,
            ]}>
              {item.price}
            </Text>
          </View>
        </TouchableOpacity>
      </React.Fragment>
    ))}
  </ScrollView>
);

/**
 * Renders the main item grid structure including the shop header.
 */
const MarketGrid: React.FC<{
  onSelectItem: (item: MarketItem) => void;
  playerEnergeia: number;
  seasonalItems: MarketItem[];
  regularItems: MarketItem[];
  subscriberItems: MarketItem[];
  seasonLabel: string;
  seasonDialogue: string;
  seasonalCharSetGroups: CharacterSetGroup[];
  baseCharSetGroups: CharacterSetGroup[];
  subscriberCharSetGroups: CharacterSetGroup[];
}> = ({ onSelectItem, seasonalItems, regularItems, subscriberItems, seasonLabel, seasonDialogue, seasonalCharSetGroups, baseCharSetGroups, subscriberCharSetGroups }) => {
  return (
    <ScrollView
      style={marketStyles.gridContainer}
      contentContainerStyle={marketStyles.gridContent}
    >
      {/* Seasonal dialogue */}
      <View style={marketStyles.dialogueBox}>
        <Text style={marketStyles.dialogueText}>{seasonDialogue}</Text>
      </View>

      {/* Seasonal items section */}
      {seasonalItems.length > 0 && (
        <>
          <View style={marketStyles.sectionHeader}>
            <Text style={marketStyles.sectionHeaderText}>★ {seasonLabel}</Text>
          </View>
          <View style={marketStyles.itemGrid}>
            {seasonalItems.map((item) => (
              <MarketItemCard key={item.id} item={item} onPress={onSelectItem} />
            ))}
          </View>
        </>
      )}

      {/* Seasonal character sets */}
      {seasonalCharSetGroups.length > 0 && (
        <>
          <View style={marketStyles.sectionHeader}>
            <Text style={marketStyles.sectionHeaderText}>⚔ Character Sets — {seasonLabel}</Text>
          </View>
          {seasonalCharSetGroups.map((group) => (
            <CharacterSetGroupRow key={group.setGroup} group={group} onPress={onSelectItem} />
          ))}
        </>
      )}

      {/* Regular items section */}
      {regularItems.length > 0 && (
        <>
          <View style={marketStyles.sectionHeader}>
            <Text style={marketStyles.sectionHeaderText}>General Store</Text>
          </View>
          <View style={marketStyles.itemGrid}>
            {regularItems.map((item) => (
              <MarketItemCard key={item.id} item={item} onPress={onSelectItem} />
            ))}
          </View>
        </>
      )}

      {/* Base class character progression (monk / nun) */}
      {baseCharSetGroups.length > 0 && (
        <>
          <View style={marketStyles.sectionHeader}>
            <Text style={marketStyles.sectionHeaderText}>Character Progression</Text>
          </View>
          {baseCharSetGroups.map((group) => (
            <CharacterSetGroupRow key={group.setGroup} group={group} onPress={onSelectItem} />
          ))}
        </>
      )}

      {/* Subscriber / out-of-season section */}
      {(subscriberItems.length > 0 || subscriberCharSetGroups.length > 0) && (
        <>
          <View style={marketStyles.sectionHeader}>
            <Text style={marketStyles.sectionHeaderText}>★ Subscriber Exclusives</Text>
          </View>
          {subscriberCharSetGroups.map((group) => (
            <CharacterSetGroupRow key={group.setGroup} group={group} onPress={onSelectItem} />
          ))}
          {subscriberItems.length > 0 && (
            <View style={marketStyles.itemGrid}>
              {subscriberItems.map((item) => (
                <MarketItemCard key={item.id} item={item} onPress={onSelectItem} />
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

// --- MAIN TAB SCREEN ---

export default function MarketScreen() {
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playerEnergeia, setPlayerEnergeia] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [seasonalItems, setSeasonalItems] = useState<MarketItem[]>([]);
  const [regularItems, setRegularItems] = useState<MarketItem[]>([]);
  const [subscriberItems, setSubscriberItems] = useState<MarketItem[]>([]);
  const [seasonalCharSetGroups, setSeasonalCharSetGroups] = useState<CharacterSetGroup[]>([]);
  const [baseCharSetGroups, setBaseCharSetGroups] = useState<CharacterSetGroup[]>([]);
  const [subscriberCharSetGroups, setSubscriberCharSetGroups] = useState<CharacterSetGroup[]>([]);
  const currentSeason = getCurrentSeason();
  const seasonLabel = SEASON_LABELS[currentSeason];
  const seasonDialogue = SEASON_DIALOGUE[currentSeason];

  const handleSelectItem = (item: MarketItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  // Fetch: profile (currency + class + gender), regular items, character set items
  const fetchMarketData = useCallback(async (currentUserId: string) => {
    try {
      // 1. Profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("energeia_currency, player_class, character_image_path")
        .eq("id", currentUserId)
        .single();
      if (profileError) throw profileError;

      setPlayerEnergeia(profile.energeia_currency);
      const playerClass: string | null = profile.player_class;
      // Derive gender from character_image_path (e.g. "fighter_male" → "male")
      const pathParts = (profile.character_image_path ?? "").split("_");
      const playerGender = pathParts[pathParts.length - 1] === "female" ? "female" : "male";
      const cls = playerClass?.toLowerCase() ?? null;

      // 2. Regular market items (everything except character sets)
      let itemQuery = supabase
        .from("items_master")
        .select("*")
        .eq("is_in_market", true)
        .neq("display_slot", "character_set");
      if (cls) {
        itemQuery = itemQuery.or(`required_class.is.null,required_class.eq.${cls}`);
      } else {
        itemQuery = itemQuery.is("required_class", null);
      }
      itemQuery = itemQuery.or(`gender.is.null,gender.eq.${playerGender}`);
      const { data: items, error: marketError } = await itemQuery;
      if (marketError) throw marketError;

      // 3. Character set items filtered by class AND gender
      let charSetQuery = supabase
        .from("items_master")
        .select("*")
        .eq("is_in_market", true)
        .eq("display_slot", "character_set")
        .order("set_group")
        .order("stage_order");
      if (cls) {
        charSetQuery = charSetQuery.or(`required_class.is.null,required_class.eq.${cls}`);
      } else {
        charSetQuery = charSetQuery.is("required_class", null);
      }
      charSetQuery = charSetQuery.or(`gender.is.null,gender.eq.${playerGender}`);
      const { data: charSetRaw } = await charSetQuery;

      // 4. User inventory
      const { data: userInv } = await supabase
        .from("user_inventory")
        .select("item_master_id")
        .eq("user_id", currentUserId);
      const ownedIds = userInv?.map((i) => i.item_master_id) || [];

      const currentSeasonKey = getCurrentSeason(); // "spring" | "summer" | "autumn" | "winter"
      const currentSeasonLabel = SEASON_LABELS[currentSeasonKey];

      // 5. Ownership detail for stage-gate checks
      const { data: ownedWithDetails } = await supabase
        .from("user_inventory")
        .select("item_master_id, item:item_master_id(set_group, stage_order)")
        .eq("user_id", currentUserId);
      const ownedSetStages = new Set(
        (ownedWithDetails ?? [])
          .filter((r: any) => r.item?.set_group)
          .map((r: any) => `${r.item.set_group}:${r.item.stage_order}`)
      );
      // Highest stage owned per set_group — used to hide already-surpassed stages from market
      const maxOwnedStage: Record<string, number> = {};
      for (const r of (ownedWithDetails ?? []) as any[]) {
        if (r.item?.set_group && r.item?.stage_order) {
          const g = r.item.set_group as string;
          const s = r.item.stage_order as number;
          if (!maxOwnedStage[g] || s > maxOwnedStage[g]) maxOwnedStage[g] = s;
        }
      }

      // 6. Prerequisite group totals for monk/nun base-class gate
      const prereqGroups = [
        ...new Set(
          (charSetRaw ?? [])
            .filter((i: any) => i.prerequisite_set_group)
            .map((i: any) => i.prerequisite_set_group as string)
        ),
      ];
      // Max stage that exists per prereq group — compared against maxOwnedStage to check completion
      const prereqMaxStage: Record<string, number> = {};
      if (prereqGroups.length > 0) {
        const { data: prereqItems } = await supabase
          .from("items_master")
          .select("set_group, stage_order")
          .in("set_group", prereqGroups);
        for (const pi of prereqItems ?? []) {
          if (pi.stage_order > (prereqMaxStage[pi.set_group] ?? 0))
            prereqMaxStage[pi.set_group] = pi.stage_order;
        }
      }

      const getLockInfo = (item: any): { isLocked: boolean; lockedReason: string | null } => {
        if (item.stage_order && item.stage_order > 1) {
          const prevKey = `${item.set_group}:${item.stage_order - 1}`;
          if (!ownedSetStages.has(prevKey))
            return { isLocked: true, lockedReason: `Purchase Stage ${item.stage_order - 1} first` };
        }
        if (item.prerequisite_set_group) {
          const maxTotal = prereqMaxStage[item.prerequisite_set_group] ?? 0;
          const maxOwned = maxOwnedStage[item.prerequisite_set_group] ?? 0;
          if (maxOwned < maxTotal)
            return { isLocked: true, lockedReason: `Complete the base class progression first (stage ${maxOwned}/${maxTotal})` };
        }
        return { isLocked: false, lockedReason: null };
      };

      const toMarketItem = (item: any, isCharSet: boolean): MarketItem => {
        const lockInfo = isCharSet ? getLockInfo(item) : { isLocked: false, lockedReason: null };
        return {
          id: item.id,
          name: item.name,
          imageSource: isCharSet
            ? (resolveCharacterSetImage(item.image_path) ?? resolveItemImage(item.image_path))
            : resolveItemImage(item.image_path),
          price: item.base_energeia_cost,
          isLocked: lockInfo.isLocked,
          lockedReason: lockInfo.lockedReason,
          isSubscriberOnly: item.is_subscriber_only ?? false,
          type: item.type,
          display_slot: item.display_slot ?? null,
          flavorText: item.flavor_text ?? "",
          description: item.description ?? "",
          season: item.season ?? null,
          hiddenBonus: { stat: item.hidden_stat_type, buff: item.hidden_buff_value },
          set_group: item.set_group ?? null,
          stage_order: item.stage_order ?? null,
          prerequisite_set_group: item.prerequisite_set_group ?? null,
        };
      };

      // 7. Regular items (non-character-set)
      const availableItems = (items ?? [])
        .filter((item: any) => !(item.is_unique && ownedIds.includes(item.id)))
        .map((item: any) => toMarketItem(item, false));
      setSeasonalItems(availableItems.filter((i) => i.season === currentSeasonLabel && !i.isSubscriberOnly));
      setRegularItems(availableItems.filter((i) => !i.season && !i.isSubscriberOnly));
      setSubscriberItems(
        availableItems
          .filter((i) => i.isSubscriberOnly || (!!i.season && i.season !== currentSeasonLabel))
          .map((i) => ({ ...i, isSubscriberOnly: true }))
      );

      // 8. Character set items — group by set_group
      // Hide stages already surpassed (stage_order <= max owned stage for that group)
      const mappedCharSets = (charSetRaw ?? [])
        .filter((item: any) => {
          const maxOwned = item.set_group ? (maxOwnedStage[item.set_group] ?? 0) : 0;
          return item.stage_order > maxOwned;
        })
        .map((item: any) => toMarketItem(item, true));

      const groupMap = new Map<string, CharacterSetGroup>();
      for (const item of mappedCharSets) {
        if (!item.set_group) continue;
        if (!groupMap.has(item.set_group)) {
          groupMap.set(item.set_group, {
            setGroup: item.set_group,
            isBaseClass: item.set_group.includes("-base"),
            season: item.season,
            items: [],
          });
        }
        groupMap.get(item.set_group)!.items.push(item);
      }

      // Normalize season key: character_sets.sql uses 'spring', market labels use 'Spring (Mar–May)'
      const normalizeSeasonKey = (s: string | null): string | null => {
        if (!s) return null;
        return s.toLowerCase().split(" ")[0];
      };

      const allGroups = [...groupMap.values()];
      setSeasonalCharSetGroups(
        allGroups.filter((g) => normalizeSeasonKey(g.season) === currentSeasonKey && !g.isBaseClass)
      );
      setBaseCharSetGroups(allGroups.filter((g) => g.isBaseClass));
      setSubscriberCharSetGroups(
        allGroups
          .filter((g) => !g.isBaseClass && normalizeSeasonKey(g.season) !== currentSeasonKey)
          .map((g) => ({
            ...g,
            items: g.items.map((i) => ({ ...i, isLocked: true, isSubscriberOnly: true, lockedReason: "Subscribers only" })),
          }))
      );
    } catch (e: any) {
      console.error("Error loading market:", e.message);
    }
  }, []);

  // 3. Setup Auth and Focus listener
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const id = session.user.id;
          setUserId(id);
          fetchMarketData(id);
        }
      };
      loadData();
    }, [fetchMarketData]),
  );

  return (
    <ThemedView style={marketStyles.container}>
      {/* 1. Static Shop Header Image */}
      <View style={marketStyles.headerImageContainer}>
        <Image
          source={require("../../../assets/sprites/ui-elements/grand finale/fin_store.png")}
          style={marketStyles.headerImage}
          resizeMode="cover"
        />
        {/* 🌟 Updated to show live playerEnergeia state */}
        <View style={marketStyles.currencyOverlay}>
          <View style={marketStyles.currencyChip}>
            <FontAwesome name="flash" size={16} color="#FFC800" />
            <Text style={marketStyles.currencyTextOverlay}>
              {playerEnergeia}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Item Grid */}
      <MarketGrid
        onSelectItem={handleSelectItem}
        playerEnergeia={playerEnergeia}
        seasonalItems={seasonalItems}
        regularItems={regularItems}
        subscriberItems={subscriberItems}
        seasonLabel={seasonLabel}
        seasonDialogue={seasonDialogue}
        seasonalCharSetGroups={seasonalCharSetGroups}
        baseCharSetGroups={baseCharSetGroups}
        subscriberCharSetGroups={subscriberCharSetGroups}
      />

      <MarketDetailsModal
        isVisible={isModalVisible}
        item={selectedItem}
        onClose={handleCloseModal}
        playerEnergeia={playerEnergeia}
        userId={userId}
        onPurchaseSuccess={() => {
          if (userId) fetchMarketData(userId);
        }}
      />
    </ThemedView>
  );
}

// --- STYLES ---

const marketStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background, // Match light background
  },
  // --- Header Image ---
  headerImageContainer: {
    width: "100%",
    height: Math.round(screenWidth * (1024 / 1536)),
    position: "relative",
    borderBottomWidth: 3,
    borderBottomColor: "#5D4037",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  // --- Currency Overlay ---
  currencyOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    flexDirection: "row",
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFC800",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  currencyTextOverlay: {
    marginLeft: 4,
    fontWeight: "bold",
    color: "#333",
    fontSize: 16,
  },
  // --- Dialogue/Title ---
  dialogueBox: {
    padding: 15,
    backgroundColor: "#FBE8B5", // Light parchment color
    borderBottomWidth: 1,
    borderBottomColor: "#FBD28B",
    alignItems: "center",
  },
  dialogueText: {
    fontSize: 16,
    color: "#5D4037", // Dark text
    fontStyle: "italic",
    textAlign: "center",
  },
  // --- Item Grid Styles ---
  gridContainer: {
    flex: 1,
    // Removed paddingHorizontal from here
    backgroundColor: "transparent",
  },
  gridContent: {
    // Removed flexDirection: "row" and flexWrap: "wrap" to allow vertical stacking of sections
    paddingTop: 0,
  },
  itemGrid: {
    // <-- NEW style block for wrapping the cards
    flexDirection: "row", // Enable horizontal layout
    flexWrap: "wrap", // Enable wrapping
    justifyContent: "space-between", // Space out the two columns
    paddingHorizontal: cardPadding, // Apply side padding here
    paddingTop: 20,
    rowGap: cardGap * 2, // Vertical spacing between rows
  },
  // --- Item Card Styles ---
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: "relative",
  },
  lockedCard: {
    opacity: 0.6, // Dim the card if locked
    borderColor: "#E74C3C", // Red border for locked
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImage: {
    width: "70%",
    height: "55%",
    marginBottom: 5,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    height: 30, // Fixed height for two lines of text
    overflow: "hidden",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE8B5",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FBD28B",
  },
  priceText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#A06E00",
    marginLeft: 5,
  },
  sectionHeader: {
    paddingHorizontal: cardPadding,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D5A3",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5D4037",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // ── Character set group row ──────────────────────────────────────────────
  charSetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: cardPadding,
    paddingVertical: 12,
    gap: 4,
  },
  stageArrow: {
    fontSize: 18,
    color: "#B0895A",
    marginHorizontal: 2,
  },
  stageCard: {
    width: 112,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  stageCardLocked: {
    opacity: 0.55,
    borderColor: "#ccc",
  },
  stageCardImage: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  stageCardName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
    height: 30,
  },
  stageCardBonus: {
    fontSize: 10,
    color: "#5a8a3c",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  stageCardPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  stageCardPriceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#A06E00",
  },
  stageCardPriceTextLocked: {
    color: "#999",
  },
  subscriberBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#9B59B6",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    zIndex: 10,
  },
  subscriberBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});

// --- MODAL STYLES ---

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  modalView: {
    width: Math.min(screenWidth * 0.85, 340),
    backgroundColor: "white",
    borderRadius: 15,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 1,
    padding: 10,
  },
  currencyDisplay: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  currencyText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 16,
    marginLeft: 4,
  },
  itemImage: {
    width: 100,
    height: 100,
    marginTop: 15,
    marginBottom: 15,
  },
  itemName: {
    fontSize: Math.min(20, screenWidth * 0.05),
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
    textAlign: "center",
  },
  itemFlavorText: {
    fontSize: Math.min(13, screenWidth * 0.033),
    color: Colors.light.tint,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: Math.min(14, screenWidth * 0.035),
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  hiddenBonusBox: {
    marginBottom: 10,
  },
  hiddenBonusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5a8a3c",
    textAlign: "center",
  },
  // --- BUY Button Specifics ---
  buyButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 15,
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
  },
  disabledButton: {
    backgroundColor: "#E74C3C",
    opacity: 0.8,
  },
  buyButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    flexShrink: 1,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  priceTagText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDECEA",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    gap: 6,
    width: "100%",
  },
  lockedBannerText: {
    fontSize: 12,
    color: "#C0392B",
    flex: 1,
  },
});
