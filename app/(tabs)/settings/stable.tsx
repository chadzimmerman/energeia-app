import { supabase } from "@/utils/supabase";
import { grantAchievement } from "@/utils/grantAchievement";
import {
  MAX_PET_NAME_LENGTH,
  canRenamePet,
  isActualRename,
  resolvePetDisplayName,
  validatePetName,
} from "@/utils/petNaming";
import { useProfile } from "@/contexts/ProfileContext";
import { getSeasonalColor } from "@/utils/seasons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
const seasonColor = getSeasonalColor();

// ── Local animal image map ────────────────────────────────────────────────────
// Metro requires static require() paths — add new animals here as art is added.

 
const ANIMAL_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  hen:      require("../../../assets/sprites/animals/new_animals/hen.png"),
  bear_cub: require("../../../assets/sprites/animals/new_animals/bear_cub.png"),
  bunny:    require("../../../assets/sprites/animals/new_animals/bunny.png"),
  calf:     require("../../../assets/sprites/animals/new_animals/calf.png"),
  duckling: require("../../../assets/sprites/animals/new_animals/duckling.png"),
  goat_kid: require("../../../assets/sprites/animals/new_animals/goat_kid.png"),
  hedgehog: require("../../../assets/sprites/animals/new_animals/hedgehog.png"),
  kitten:   require("../../../assets/sprites/animals/new_animals/kitten.png"),
  lamb:     require("../../../assets/sprites/animals/new_animals/lamb.png"),
  mouse:    require("../../../assets/sprites/animals/new_animals/mouse.png"),
  pig:      require("../../../assets/sprites/animals/new_animals/pig.png"),
  pony:     require("../../../assets/sprites/animals/new_animals/pony.png"),
  puppy:    require("../../../assets/sprites/animals/new_animals/puppy.png"),
  squirrel: require("../../../assets/sprites/animals/new_animals/squirrel.png"),
};

const resolveAnimalImage = (key: string): ImageSourcePropType => {
  if (key.startsWith("http")) return { uri: key };
  return ANIMAL_IMAGE_MAP[key] ?? ANIMAL_IMAGE_MAP["puppy"];
};

// ── Season helper ─────────────────────────────────────────────────────────────

const getCurrentSeason = (): string => {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface StableAnimal {
  id: string;           // item_master_id
  name: string;
  defaultPetName: string;
  customPetName: string | null;  // user's rename, overrides defaultPetName
  imageSource: ImageSourcePropType;
  price: number;
  flavorText: string;
  description: string;
  isSeasonal: boolean;
  season: string | null;
  isSubscriberOnly: boolean;
  inventoryId: string | null;   // null = not owned
  isEquipped: boolean;
  happiness: number;
  /** How many times the player has renamed this animal. First one is free. */
  renameCount: number;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const screenWidth = Dimensions.get("window").width;
const CARD_PADDING = 15;
const CARD_GAP = 10;
const cardSize = (screenWidth - CARD_PADDING * 2 - CARD_GAP) / 2;

// ── Shop Animal Card (unowned) ────────────────────────────────────────────────

const AnimalCard: React.FC<{
  animal: StableAnimal;
  onPress: (animal: StableAnimal) => void;
}> = ({ animal, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { width: cardSize, height: cardSize * 1.4 }]}
    onPress={() => onPress(animal)}
    activeOpacity={0.75}
  >
    <Image
      source={animal.imageSource}
      style={styles.cardImage}
      resizeMode="contain"
    />
    <Text style={styles.cardName} numberOfLines={2}>{animal.defaultPetName}</Text>
    {animal.isSeasonal && (
      <View style={styles.seasonBadge}>
        <Text style={styles.seasonBadgeText}>{animal.season ?? "Seasonal"}</Text>
      </View>
    )}
    {animal.isSubscriberOnly && (
      <View style={styles.subscriberBadge}>
        <FontAwesome name="star" size={9} color="#fff" />
        <Text style={styles.subscriberBadgeText}>SUB</Text>
      </View>
    )}
    <View style={styles.priceRow}>
      <FontAwesome name="flash" size={12} color="#A06E00" />
      <Text style={styles.priceText}>{animal.price}</Text>
    </View>
  </TouchableOpacity>
);

// ── Owned Animal Card ─────────────────────────────────────────────────────────

const OwnedAnimalCard: React.FC<{
  animal: StableAnimal;
  onPress: (animal: StableAnimal) => void;
}> = ({ animal, onPress }) => (
  <TouchableOpacity
    style={[styles.card, styles.ownedCard, { width: cardSize, height: cardSize * 1.4 }]}
    onPress={() => onPress(animal)}
    activeOpacity={0.75}
  >
    <Image
      source={animal.imageSource}
      style={styles.cardImage}
      resizeMode="contain"
    />
    <Text style={styles.cardName} numberOfLines={2}>{animal.defaultPetName}</Text>
    <View style={[styles.priceRow, animal.isEquipped && styles.equippedBadge]}>
      <FontAwesome
        name={animal.isEquipped ? "check" : "plus"}
        size={12}
        color={animal.isEquipped ? "#2ECC71" : "#A06E00"}
      />
      <Text style={[styles.priceText, animal.isEquipped && styles.equippedText]}>
        {animal.isEquipped ? "Equipped" : "Equip"}
      </Text>
    </View>
  </TouchableOpacity>
);

// ── Purchase / Equip Modal ────────────────────────────────────────────────────

const AnimalModal: React.FC<{
  visible: boolean;
  animal: StableAnimal | null;
  playerEnergeia: number;
  userId: string | null;
  isSubscriber: boolean;
  allAnimalItemIds: string[];
  onClose: () => void;
  onPurchaseSuccess: () => void;
  onEquipSuccess: () => void;
}> = ({ visible, animal, playerEnergeia, userId, isSubscriber, allAnimalItemIds, onClose, onPurchaseSuccess, onEquipSuccess }) => {
  const router = useRouter();
  const [nameInput, setNameInput] = useState("");
  const [savedName, setSavedName] = useState("");
  // Mirrors animal.renameCount locally. The prop only refreshes when the
  // parent refetches, which is too late to stop a second rename in the same
  // sitting — the same staleness that made cancel restore the old name (#19).
  const [renameCount, setRenameCount] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (animal) {
      const initial = resolvePetDisplayName(animal.customPetName, animal.defaultPetName);
      setNameInput(initial);
      setSavedName(initial);
      setRenameCount(animal.renameCount ?? 0);
      setIsEditingName(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal?.inventoryId]);

  if (!animal) return null;

  const canAfford = playerEnergeia >= animal.price;
  const isLocked = animal.isSubscriberOnly;
  const isOwned = animal.inventoryId !== null;

  const handleBuy = async () => {
    try {
      const { error: invError } = await supabase
        .from("user_inventory")
        .insert({
          user_id: userId,
          item_master_id: animal.id,
          // Adopted animals arrive already named, rather than leaning on the
          // display falling back to the item default.
          pet_name: animal.defaultPetName,
          pet_rename_count: 0,
        });

      if (invError) throw invError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ energeia_currency: playerEnergeia - animal.price })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Achievement grants
      if (userId) {
        grantAchievement(userId, "first_pet");

        // all_pets: own every animal item
        const { data: allAnimals } = await supabase.from("items_master").select("id").eq("type", "animal");
        const { data: ownedAnimals } = await supabase.from("user_inventory").select("item_master_id").eq("user_id", userId);
        const ownedIds = new Set([...(ownedAnimals ?? []).map((r: any) => r.item_master_id), animal.id]);
        if (allAnimals && allAnimals.length > 0 && allAnimals.every((a: any) => ownedIds.has(a.id)))
          grantAchievement(userId, "all_pets");
      }

      onPurchaseSuccess();
      onClose();
      Alert.alert("Welcome Home!", `${animal.defaultPetName} has joined your stable.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleEquip = async () => {
    if (!animal.inventoryId) return;
    try {
      // Unequip all other owned animals first
      if (allAnimalItemIds.length > 0) {
        const { error: unequipErr } = await supabase
          .from("user_inventory")
          .update({ is_equipped: false })
          .eq("user_id", userId)
          .in("item_master_id", allAnimalItemIds);
        if (unequipErr) throw unequipErr;
      }
      // Equip this one
      const { error: equipErr } = await supabase
        .from("user_inventory")
        .update({ is_equipped: true })
        .eq("id", animal.inventoryId);
      if (equipErr) throw equipErr;

      onEquipSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Equip Error", e.message);
    }
  };

  const handleUnequip = async () => {
    if (!animal.inventoryId) return;
    try {
      const { error: unequipErr } = await supabase
        .from("user_inventory")
        .update({ is_equipped: false })
        .eq("id", animal.inventoryId);
      if (unequipErr) throw unequipErr;

      onEquipSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // One free rename per animal; after that it is a subscriber feature.
  const renameVerdict = canRenamePet(renameCount, isSubscriber);

  const showRenameUpsell = () => {
    Alert.alert(
      "Renaming is for Subscribers",
      `${savedName} has already been given a new name. Subscribers can rename their companions as often as they like.`,
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "See Subscription",
          onPress: () => {
            onClose();
            router.push("/(tabs)/settings/subscription");
          },
        },
      ],
    );
  };

  const handleStartEditingName = () => {
    if (!renameVerdict.allowed) {
      showRenameUpsell();
      return;
    }
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!animal.inventoryId) return;

    const validation = validatePetName(nameInput);
    if (!validation.valid) {
      Alert.alert("Invalid Name", validation.error);
      return;
    }
    const nextName = validation.name;

    // Saving the name it already has is not a rename. Without this, opening the
    // editor and tapping the check would spend the one free change.
    if (!isActualRename(savedName, nextName)) {
      setNameInput(savedName);
      setIsEditingName(false);
      return;
    }

    // Re-checked here rather than trusting that the editor was only reachable
    // through handleStartEditingName.
    if (!renameVerdict.allowed) {
      showRenameUpsell();
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("user_inventory")
        .update({
          pet_name: nextName,
          pet_rename_count: renameCount + 1,
        })
        .eq("id", animal.inventoryId);
      if (error) throw error;

      setSavedName(nextName);
      setNameInput(nextName);
      setRenameCount((prev) => prev + 1);
      setIsEditingName(false);
      onEquipSuccess();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={modal.card} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <FontAwesome name="times" size={22} color="#888" />
          </TouchableOpacity>

          {isOwned ? (
            // ── Owned animal — barn view ──────────────────────────────
            <ScrollView style={{ width: "100%" }} contentContainerStyle={{ alignItems: "center", paddingTop: 8 }} showsVerticalScrollIndicator={false}>
              {/* Barn background with animal */}
              <View style={modal.barnContainer}>
                <Image
                  source={require("../../../assets/sprites/ui-elements/barn-square-background.jpg")}
                  style={modal.barnBackground}
                />
                <Image source={animal.imageSource} style={modal.barnAnimal} resizeMode="contain" />
              </View>

              {/* Editable name */}
              {isEditingName ? (
                <View style={modal.nameEditRow}>
                  <TextInput
                    style={modal.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    maxLength={MAX_PET_NAME_LENGTH}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveName} disabled={isSavingName} style={{ padding: 4 }}>
                    <FontAwesome name="check" size={20} color="#2ECC71" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setIsEditingName(false); setNameInput(savedName); }} style={{ padding: 4 }}>
                    <FontAwesome name="times" size={20} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={modal.nameRow} onPress={handleStartEditingName}>
                  <Text style={modal.name}>
                    {resolvePetDisplayName(nameInput, animal.defaultPetName)}
                  </Text>
                  {/* A lock rather than a hidden control: the rename is still
                      tappable so it can explain what unlocks it. */}
                  <FontAwesome
                    name={renameVerdict.allowed ? "pencil" : "lock"}
                    size={13}
                    color={renameVerdict.allowed ? "#bbb" : "#B8860B"}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}

              {/* Happiness bar */}
              <Text style={modal.happinessLabel}>Happiness</Text>
              <View style={modal.happinessRow}>
                {Array.from({ length: 10 }, (_, i) => (
                  <FontAwesome
                    key={i}
                    name={i < animal.happiness ? "heart" : "heart-o"}
                    size={18}
                    color={i < animal.happiness ? "#E74C3C" : "#ddd"}
                    style={{ marginHorizontal: 2 }}
                  />
                ))}
              </View>

              <Text style={modal.flavor}>{animal.flavorText}</Text>
              <Text style={modal.desc}>{animal.description}</Text>

              {animal.isEquipped ? (
                <TouchableOpacity style={[modal.buyBtn, modal.unequipBtn]} onPress={handleUnequip}>
                  <FontAwesome name="times-circle" size={15} color="#fff" />
                  <Text style={modal.buyText}>UNEQUIP</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[modal.buyBtn, modal.equipBtn]} onPress={handleEquip}>
                  <FontAwesome name="check-circle" size={15} color="#fff" />
                  <Text style={modal.buyText}>EQUIP COMPANION</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            // ── Unowned animal — shop view ────────────────────────────
            <>
              <View style={modal.currencyChip}>
                <FontAwesome name="flash" size={14} color="#FFC800" />
                <Text style={modal.currencyText}>{playerEnergeia}</Text>
              </View>

              <Image source={animal.imageSource} style={modal.image} resizeMode="contain" />
              <Text style={modal.name}>{animal.defaultPetName}</Text>
              <Text style={modal.flavor}>{animal.flavorText}</Text>
              <Text style={modal.desc}>{animal.description}</Text>

              <TouchableOpacity
                style={[modal.buyBtn, isLocked ? modal.subscriberBtn : !canAfford && modal.disabledBtn]}
                onPress={handleBuy}
                disabled={isLocked || !canAfford}
              >
                {isLocked ? (
                  <>
                    <FontAwesome name="star" size={15} color="#fff" />
                    <Text style={modal.buyText}>SUBSCRIBERS ONLY</Text>
                  </>
                ) : (
                  <>
                    <Text style={modal.buyText}>{canAfford ? "ADOPT" : "CANNOT AFFORD"}</Text>
                    <View style={modal.priceTag}>
                      <FontAwesome name="flash" size={13} color="#A06E00" />
                      <Text style={modal.priceTagText}>{animal.price}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function StableScreen() {
  const { refreshProfile } = useProfile();
  const [animals, setAnimals] = useState<StableAnimal[]>([]);
  const [playerEnergeia, setPlayerEnergeia] = useState(0);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StableAnimal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStableData = useCallback(async (uid: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("energeia_currency, is_subscriber")
        .eq("id", uid)
        .single();

      if (profile) {
        setPlayerEnergeia(profile.energeia_currency);
        setIsSubscriber(profile.is_subscriber ?? false);
      }

      const { data: items, error } = await supabase
        .from("items_master")
        .select("*")
        .eq("type", "animal");

      if (error) throw error;

      // Fetch inventory with equipped state and pet data
      const { data: inventory } = await supabase
        .from("user_inventory")
        .select("id, item_master_id, is_equipped, pet_name, pet_rename_count, happiness, happiness_decay_date, last_pet_tap_date")
        .eq("user_id", uid);

      // Apply happiness decay for any owned animals not yet checked today
      const today = new Date().toISOString().split("T")[0];
      for (const inv of (inventory ?? []) as any[]) {
        if (inv.happiness_decay_date === today) continue;
        let daysDecay = 0;
        if (inv.last_pet_tap_date) {
          const diffMs = new Date(today).getTime() - new Date(inv.last_pet_tap_date).getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          daysDecay = Math.max(0, diffDays - 1);
        }
        const newHappiness = Math.max(0, (inv.happiness ?? 5) - daysDecay);
        await supabase.from("user_inventory").update({ happiness: newHappiness, happiness_decay_date: today }).eq("id", inv.id);
        inv.happiness = newHappiness;
      }

      // Build a map: item_master_id → owned data
      const ownedMap: Record<string, { inventoryId: string; isEquipped: boolean; happiness: number; customPetName: string | null; renameCount: number }> = {};
      (inventory ?? []).forEach((inv: any) => {
        ownedMap[inv.item_master_id] = {
          inventoryId: inv.id,
          isEquipped: inv.is_equipped ?? false,
          happiness: inv.happiness ?? 5,
          customPetName: inv.pet_name ?? null,
          renameCount: inv.pet_rename_count ?? 0,
        };
      });

      const currentSeason = getCurrentSeason();

      const mapped = (items ?? []).map((item) => {
          const isOutOfSeason = !item.is_permanent && !!item.season && !item.season.startsWith(currentSeason);
          return {
            id: item.id,
            name: item.name,
            defaultPetName: item.default_pet_name ?? item.name,
            customPetName: ownedMap[item.id]?.customPetName ?? null,
            imageSource: resolveAnimalImage(item.image_path ?? ""),
            price: item.base_energeia_cost,
            flavorText: item.flavor_text,
            description: item.description,
            isSeasonal: !item.is_permanent,
            season: item.season ?? null,
            isSubscriberOnly: (item.is_subscriber_only ?? false) || isOutOfSeason,
            inventoryId: ownedMap[item.id]?.inventoryId ?? null,
            isEquipped: ownedMap[item.id]?.isEquipped ?? false,
            happiness: ownedMap[item.id]?.happiness ?? 5,
            renameCount: ownedMap[item.id]?.renameCount ?? 0,
          };
        });

      setAnimals(mapped);
    } catch (e: any) {
      console.error("Stable load error:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          fetchStableData(session.user.id);
        }
      };
      load();
    }, [fetchStableData]),
  );

  const myAnimals        = animals.filter((a) => a.inventoryId !== null);
  const shopAnimals      = animals.filter((a) => a.inventoryId === null);
  const regular          = shopAnimals.filter((a) => !a.isSeasonal && !a.isSubscriberOnly);
  const inSeason         = shopAnimals.filter((a) => a.isSeasonal && !a.isSubscriberOnly);
  const subscriberLocked = shopAnimals.filter((a) => a.isSubscriberOnly);

  // All owned animal item IDs — used to unequip all before equipping a new one
  const allAnimalItemIds = myAnimals.map((a) => a.id);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {/* Header image with currency overlay */}
      <View style={styles.headerImageContainer}>
        <Image
          source={require("../../../assets/sprites/ui-elements/grand finale/stable.png")}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.currencyOverlay}>
          <View style={styles.currencyChip}>
            <FontAwesome name="flash" size={16} color="#FFC800" />
            <Text style={styles.currencyText}>{playerEnergeia}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.innkeeperText}>
          "Care for your animals as you care for your soul — with patience and
          devotion."
        </Text>

        {/* My Companions */}
        {myAnimals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Companions</Text>
            <View style={styles.grid}>
              {myAnimals.map((a) => (
                <OwnedAnimalCard key={a.id} animal={a} onPress={setSelected} />
              ))}
            </View>
          </>
        )}

        {/* Regular Animals */}
        <Text style={styles.sectionTitle}>Animals</Text>
        {regular.length === 0 ? (
          <Text style={styles.emptyText}>No animals available yet. Check back soon.</Text>
        ) : (
          <View style={styles.grid}>
            {regular.map((a) => (
              <AnimalCard key={a.id} animal={a} onPress={setSelected} />
            ))}
          </View>
        )}

        {/* In-Season Companions */}
        {inSeason.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Seasonal Companions</Text>
            <View style={styles.grid}>
              {inSeason.map((a) => (
                <AnimalCard key={a.id} animal={a} onPress={setSelected} />
              ))}
            </View>
          </>
        )}

        {/* Subscriber / Out-of-Season Companions */}
        {subscriberLocked.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Subscriber Companions</Text>
            <View style={styles.grid}>
              {subscriberLocked.map((a) => (
                <AnimalCard key={a.id} animal={a} onPress={setSelected} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AnimalModal
        visible={!!selected}
        animal={selected}
        playerEnergeia={playerEnergeia}
        userId={userId}
        isSubscriber={isSubscriber}
        allAnimalItemIds={allAnimalItemIds}
        onClose={() => setSelected(null)}
        onPurchaseSuccess={() => {
          if (userId) fetchStableData(userId);
          refreshProfile();
        }}
        onEquipSuccess={() => {
          if (userId) fetchStableData(userId);
          refreshProfile();
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F0" },
  headerImageContainer: {
    width: "100%",
    height: Math.round(screenWidth * (720 / 1280)),
    position: "relative",
    borderBottomWidth: 3,
    borderBottomColor: "#5D4037",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  currencyOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FFC800",
    gap: 5,
  },
  currencyText: { color: "#333", fontWeight: "bold", fontSize: 15 },
  scroll: { paddingBottom: 20 },
  innkeeperText: {
    fontSize: 14,
    color: "#5D4037",
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#FBE8B5",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FBD28B",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: CARD_PADDING,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAAAAA",
    fontStyle: "italic",
    paddingHorizontal: CARD_PADDING,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: CARD_PADDING,
    rowGap: CARD_GAP * 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  ownedCard: {
    borderColor: seasonColor,
    backgroundColor: "#FAF4FF",
  },
  cardImage: { width: "65%", height: "50%", marginBottom: 4 },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 6,
    height: 34,
  },
  seasonBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#9370DB",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seasonBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  subscriberBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#B8860B",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  subscriberBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBE8B5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FBD28B",
    gap: 4,
  },
  equippedBadge: {
    backgroundColor: "#E8F8EF",
    borderColor: "#2ECC71",
  },
  priceText: { fontSize: 14, fontWeight: "bold", color: "#A06E00" },
  equippedText: { color: "#2ECC71" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    position: "relative",
  },
  closeBtn: { position: "absolute", top: 10, left: 10, padding: 8 },
  currencyChip: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  currencyText: { fontWeight: "600", color: "#333", fontSize: 14 },
  image: { width: 110, height: 110, marginTop: 20, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 4 },
  flavor: { fontSize: 13, color: "#9370DB", fontStyle: "italic", textAlign: "center", marginBottom: 8 },
  desc: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 12 },
  buyBtn: {
    backgroundColor: "#5D4037",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  equipBtn: { backgroundColor: seasonColor },
  unequipBtn: { backgroundColor: "#888" },
  disabledBtn: { backgroundColor: "#E74C3C", opacity: 0.8 },
  subscriberBtn: { backgroundColor: "#B8860B" },
  buyText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  priceTagText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  barnContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 32,
    marginBottom: 12,
    position: "relative",
  },
  barnBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  barnAnimal: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: "55%",
    height: "55%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    width: "100%",
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingVertical: 2,
    textAlign: "center",
  },
  happinessLabel: {
    fontSize: 11,
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  happinessRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
});
