import CharacterStats from "@/components/CharacterStats";
import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// --- TYPES (KEPT) ---

// Define the structure for an item
interface Item {
  id: string; // The user_inventory row ID (UUID)
  item_id: string; // The actual item type ID (e.g., "1", "2")
  quantity: number; //number of items
  name: string;
  energeiaNumber: number; // Base value (base_energeia_cost from DB)
  is_equipped: boolean; // Tracking equipped state (from user_inventory)
  isLocked: boolean; // Tracking locked state (from items_master, if you add it)
  requiredClass: string | null;
  imageSource: ImageSourcePropType;
  type: "consumable" | "equippable";
  flavorText: string;
  description: string;
  hiddenBonus: {
    stat: "energeia" | "defense" | "health";
    buff: number;
  };
}

interface Profile {
  id: string;
  username: string;
  current_health: number;
  max_health: number;
  current_energeia: number; // This is the currency
  max_energeia: number;
  character_image_path: string;
}

// Get screen width to calculate responsive card size
const screenWidth = Dimensions.get("window").width;
const cardSize = (screenWidth - 20 * 3) / 2; // 20px padding on left, right, and between cards

// --- UTILITIES (CLEANED UP) ---

// Map for local image paths (REQUIRED for require() calls)
// This MUST match the paths used when inserting data into items_master
const RawItemImagePathMap: { [key: string]: string } = {
  "2ea753aa-484b-428a-abe2-e630007aee20":
    "../../assets/sprites/animals/baby-bear.png",
  "8c86d9f2-1db2-4e11-bd21-156076c23a9f":
    "../../assets/sprites/icons/theotokos-icon.png",
  "9cca09c7-ba18-49b9-93cb-b4dce413159f":
    "../../assets/sprites/items/sword.png",
  "2301f7f7-c2fc-4a20-be2a-6b6c843de4b9":
    "../../assets/sprites/items/warrior-helmet.png",
  "b4fd6529-39cd-48f9-9baa-111f4487d9a4":
    "../../assets/sprites/items/great-schema-robes.png",
  "c3a1450e-46f3-4a88-8b1e-8d31f2086f80":
    "../../assets/sprites/items/shield.png",
  "0f2bdb9b-d838-4108-bf43-d93b2a07d0ed":
    "../../assets/sprites/items/relic-skull.png",
  "9b04e0c5-14fc-44d7-b72c-5ed9abb4c276":
    "../../assets/sprites/items/chotki.png",
  "63537178-f4ff-4bcd-8572-fd71244c6a24":
    "../../assets/sprites/items/candle.png",
  "fd803603-2861-47a9-91d7-260a108945fa":
    "../../assets/sprites/items/philokalia.png",
};

// 🌟 FIX: Pre-resolve the image assets at compile time 🌟
const ResolvedImageSourceMap: { [key: string]: ImageSourcePropType } = {
  "2ea753aa-484b-428a-abe2-e630007aee20": require("../../assets/sprites/animals/baby-bear.png"),
  "8c86d9f2-1db2-4e11-bd21-156076c23a9f": require("../../assets/sprites/icons/theotokos-icon.png"),
  "9cca09c7-ba18-49b9-93cb-b4dce413159f": require("../../assets/sprites/items/sword.png"),
  "2301f7f7-c2fc-4a20-be2a-6b6c843de4b9": require("../../assets/sprites/items/warrior-helmet.png"),
  "b4fd6529-39cd-48f9-9baa-111f4487d9a4": require("../../assets/sprites/items/great-schema-robes.png"),
  "c3a1450e-46f3-4a88-8b1e-8d31f2086f80": require("../../assets/sprites/items/shield.png"),
  "0f2bdb9b-d838-4108-bf43-d93b2a07d0ed": require("../../assets/sprites/items/relic-skull.png"),
  "9b04e0c5-14fc-44d7-b72c-5ed9abb4c276": require("../../assets/sprites/items/chotki.png"),
  "63537178-f4ff-4bcd-8572-fd71244c6a24": require("../../assets/sprites/items/candle.png"),
  "fd803603-2861-47a9-91d7-260a108945fa": require("../../assets/sprites/items/philokalia.png"),
};

// Define the default local image path and resolve it statically
const DEFAULT_IMAGE_PATH_STRING =
  "../../assets/sprites/characters/monk/novice-monk-male.png";
const DEFAULT_IMAGE_SOURCE = require(DEFAULT_IMAGE_PATH_STRING);

// Helper function to resolve the character image source (KEPT)
const resolveImageSource = (path: string): ImageSourcePropType => {
  // Check if the path contains the unique part of the default path string
  if (path.includes("novice-monk-male.png")) {
    return DEFAULT_IMAGE_SOURCE; // Return the statically required asset
  }
  return { uri: path };
};

// --- COMPONENTS (UPDATED WITH PROPS) ---

/**
 * Renders the modal that pops up when an item is clicked.
 * NOW receives live handlers and item data.
 */
const ItemDetailsModal: React.FC<{
  isVisible: boolean;
  item: Item | null;
  onClose: () => void;
  playerEnergeia: number;
  handleSell: (item: Item) => Promise<void>; // New prop
  handleUseEquip: (item: Item) => Promise<void>; // New prop
}> = ({
  isVisible,
  item,
  onClose,
  playerEnergeia,
  handleSell,
  handleUseEquip,
}) => {
  if (!item) return null;

  // Use the handlers passed from the parent
  const handleUseEquipClick = () => handleUseEquip(item);
  const handleSellClick = () => handleSell(item);

  // Determine button text and prices
  const useEquipText =
    item.type === "consumable" ? "Use" : item.is_equipped ? "Unequip" : "Equip";
  const sellPrice = Math.floor(item.energeiaNumber / 2);

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <ThemedView
          style={modalStyles.modalView}
          onStartShouldSetResponder={() => true}
        >
          {/* Top Currency Display (Energeia) */}
          <View style={modalStyles.currencyDisplay}>
            <View style={modalStyles.currencyChip}>
              <View style={modalStyles.coinIcon} />
              <Text style={modalStyles.currencyText}>{playerEnergeia}</Text>
            </View>
          </View>

          {/* Item Image */}
          <Image
            source={item.imageSource}
            style={modalStyles.itemImage}
            resizeMode="contain"
          />

          {/* Item Name & Equipped Status */}
          <ThemedText style={modalStyles.itemName}>
            {item.name}
            {item.is_equipped && (
              <Text style={{ fontSize: 14, color: "#2ECC71" }}>
                {" "}
                (EQUIPPED)
              </Text>
            )}
          </ThemedText>

          {/* Flavor Text and Description */}
          <ThemedText style={modalStyles.itemFlavorText}>
            {item.flavorText}
          </ThemedText>
          <ThemedText style={modalStyles.itemDescription}>
            {item.description}
          </ThemedText>

          {/* Hidden Bonus */}
          <View style={modalStyles.hiddenBonusBox}>
            <ThemedText style={modalStyles.hiddenBonusText}>
              Hidden Bonus: +{item.hiddenBonus.buff} {item.hiddenBonus.stat}
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={modalStyles.buttonRow}>
            {/* Use/Equip Button */}
            <TouchableOpacity
              style={[
                modalStyles.actionButton,
                modalStyles.useEquipButton,
                item.isLocked && { backgroundColor: "#A0A0A0" }, // Dim if locked
              ]}
              onPress={handleUseEquipClick}
              disabled={item.isLocked}
            >
              <Text style={modalStyles.buttonText}>{useEquipText}</Text>
            </TouchableOpacity>

            {/* Sell Button */}
            <TouchableOpacity
              style={[modalStyles.actionButton, modalStyles.sellButton]}
              onPress={handleSellClick}
            >
              <Text style={modalStyles.buttonText}>Sell</Text>
              {/* Energeia Icon and Sell Price */}
              <View style={modalStyles.sellPriceContainer}>
                <View style={modalStyles.coinIconSmall} />
                <Text style={modalStyles.sellPriceText}>{sellPrice}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Renders a single item card with its image, price, and lock status.
 */
const ItemCard: React.FC<{ item: Item; onPress: (item: Item) => void }> = ({
  item,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { width: cardSize, height: cardSize * 1.5 },
        item.is_equipped && styles.equippedBorder,
      ]}
      onPress={() => onPress(item)}
    >
      <Image
        source={item.imageSource}
        style={styles.itemImage}
        resizeMode="contain"
      />

      {/* 🌟 NEW: Stack Quantity Badge */}
      {item.quantity > 1 && (
        <View style={styles.stackBadge}>
          <Text style={styles.stackText}>{item.quantity}x</Text>
        </View>
      )}

      <ThemedView style={styles.priceContainer}>
        <View style={styles.coinIcon} />
        <ThemedText style={styles.priceText}>{item.energeiaNumber}</ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );
};

/**
 * Renders the main item grid structure.
 * NOW receives live inventory and currency.
 */
const ItemGrid: React.FC<{
  onSelectItem: (item: Item) => void;
  inventory: Item[]; // New prop
  playerEnergeia: number; // New prop (Though only currency is displayed here)
}> = ({ onSelectItem, inventory, playerEnergeia }) => {
  return (
    <ScrollView
      style={styles.gridContainer}
      contentContainerStyle={styles.gridContent}
    >
      {/* Energy/Gem Indicators (Using live currency) */}
      <View style={styles.currencyRow}>
        <View style={styles.currencyChip}>
          <View style={styles.coinIcon} />
          <Text style={styles.currencyText}>{playerEnergeia}</Text>
        </View>
      </View>

      {/* Item Grid */}
      <View style={styles.itemGridWrap}>
        {/* Render the live inventory data */}
        {inventory.map((item) => (
          <ItemCard key={item.id} item={item} onPress={onSelectItem} />
        ))}
      </View>
    </ScrollView>
  );
};

// --- MAIN TAB SCREEN (UPDATED) ---

export default function ItemsTabScreen() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH PROFILE (KEPT) ---
  const fetchProfile = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (e: any) {
      console.error("Profile Fetch Error:", e.message);
    }
  }, []);

  // --- FETCH INVENTORY (LIVE QUERY IMPLEMENTED) ---
  const fetchInventory = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_inventory")
        .select(
          `
        id,                 
        is_equipped,        
        is_locked,
        item:item_master_id ( 
            id, 
            name, 
            flavor_text, 
            description, 
            base_energeia_cost, 
            type, 
            image_path,
            hidden_stat_type,   
            hidden_buff_value,
            required_class
        )
      `,
        )
        .eq("user_id", currentUserId);

      if (error) throw error;

      // --- GROUPING LOGIC START ---
      const groupedItems: { [key: string]: Item } = {};

      data.forEach((record) => {
        const itemMaster = record.item as any;
        if (!itemMaster) return;

        const itemId = itemMaster.id;

        // We group by item_id ONLY for consumables.
        // Equippables (sword, etc.) usually stay unique so you can equip one and not the other.
        const isStackable = itemMaster.type === "consumable";
        const groupKey = isStackable ? itemId : record.id;

        if (groupedItems[groupKey]) {
          groupedItems[groupKey].quantity += 1;
        } else {
          groupedItems[groupKey] = {
            id: record.id,
            item_id: itemId,
            quantity: 1,
            name: itemMaster.name,
            imageSource: { uri: itemMaster.image_path }, // Directly use the Supabase URL
            energeiaNumber: itemMaster.base_energeia_cost,
            type: itemMaster.type,
            flavorText: itemMaster.flavor_text,
            description: itemMaster.description,
            requiredClass: itemMaster.required_class,
            hiddenBonus: {
              stat: itemMaster.hidden_stat_type,
              buff: itemMaster.hidden_buff_value,
            },
          } as Item;
        }
      });

      // Convert our map back into an array for the state
      setInventory(Object.values(groupedItems));
      // --- GROUPING LOGIC END ---
    } catch (e: any) {
      console.error("Inventory Fetch Error:", e.message);
    }
  }, []);

  // --- AUTH & REFRESH (KEPT) ---
  useEffect(() => {
    const setup = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user =
        session?.user || (await supabase.auth.signInAnonymously()).data.user;

      if (user?.id) {
        setUserId(user.id);
      } else {
        console.error("User ID not found after authentication.");
      }
      setLoading(false);
    };
    setup();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchProfile(userId);
        fetchInventory(userId);
      }
      return () => {};
    }, [userId, fetchProfile, fetchInventory]),
  );

  // --- HANDLERS (KEPT, BUT NOW PASSED AS PROPS) ---
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  const handleSell = async (item: Item) => {
    if (!userId || !profile) return;
    // ... (Sell logic remains the same) ...
    try {
      const sellPrice = Math.floor(item.energeiaNumber / 2);
      const finalEnergeia = Math.min(
        profile.current_energeia + sellPrice,
        profile.max_energeia,
      );

      await supabase
        .from("profiles")
        .update({ current_energeia: finalEnergeia })
        .eq("id", userId);

      await supabase.from("user_inventory").delete().eq("id", item.id);

      await fetchProfile(userId);
      await fetchInventory(userId);
      console.log(`${item.name} sold for ${sellPrice} Energeia.`);
      handleCloseModal();
    } catch (e: any) {
      console.error("Sell Item Error:", e.message);
    }
  };

  const handleUseEquip = async (item: Item) => {
    if (!userId || !profile) return;

    try {
      if (item.type === "equippable") {
        const newState = !item.is_equipped;

        await supabase
          .from("user_inventory")
          .update({ is_equipped: newState })
          .eq("id", item.id);
      } else if (item.type === "consumable") {
        if (item.hiddenBonus.stat === "energeia") {
          const buff = item.hiddenBonus.buff;
          const newEnergeia = Math.min(
            profile.current_energeia + buff,
            profile.max_energeia,
          );

          await supabase
            .from("profiles")
            .update({ current_energeia: newEnergeia })
            .eq("id", userId);

          await supabase.from("user_inventory").delete().eq("id", item.id);
        }
      }

      await fetchProfile(userId);
      await fetchInventory(userId);
      handleCloseModal();
    } catch (e: any) {
      console.error("Use/Equip Item Error:", e.message);
    }
  };

  if (loading || !profile) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#0000ff"
          style={styles.loading}
        />
        <ThemedText style={styles.text}>Loading Inventory...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* 1. Character Stats Header (Using live profile data) */}
      <CharacterStats
        backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
        characterImageSource={resolveImageSource(profile.character_image_path)}
        currentHealth={profile.current_health}
        maxHealth={profile.max_health}
        currentEnergy={profile.current_energeia}
        maxEnergy={profile.max_energeia}
      />

      {/* 2. Item Grid (Passing live inventory and currency) */}
      <ItemGrid
        onSelectItem={handleSelectItem}
        inventory={inventory}
        playerEnergeia={profile.current_energeia}
      />

      {/* 3. Item Details Modal (Passing live item and live handlers) */}
      <ItemDetailsModal
        isVisible={isModalVisible}
        item={selectedItem}
        onClose={handleCloseModal}
        playerEnergeia={profile.current_energeia}
        handleSell={handleSell}
        handleUseEquip={handleUseEquip}
      />
    </ThemedView>
  );
}

// --- STYLES (ADDED equippedBorder) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ADDED: Style for equipped items
  equippedBorder: {
    borderColor: "#2ECC71", // Green color
    borderWidth: 3,
    elevation: 4,
    shadowColor: "#2ECC71",
    shadowOpacity: 0.8,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: "transparent",
  },
  gridContent: {
    paddingBottom: 20,
  },
  itemGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 10,
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 15,
    marginRight: 10,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  currencyText: {
    marginLeft: 4,
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: "70%",
    height: "60%",
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE8B5",
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FBD28B",
  },
  coinIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC800",
    marginRight: 5,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A06E00",
  },
  lockIconContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  lockIcon: {
    fontSize: 14,
  },
  loading: {
    marginTop: 50,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  stackBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stackText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

// --- MODAL STYLES (KEPT) ---
const modalStyles = StyleSheet.create({
  // ... (all modal styles are the same as before)
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: "relative",
  },
  currencyDisplay: {
    position: "absolute",
    top: 15,
    right: 15,
    flexDirection: "row",
    gap: 8,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  coinIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFC800",
    marginRight: 4,
  },
  currencyText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 16,
  },
  itemImage: {
    width: 100,
    height: 100,
    marginTop: 20,
    marginBottom: 15,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  itemFlavorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  itemDescription: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  hiddenBonusBox: {
    height: 15,
    opacity: 0.01,
    overflow: "hidden",
    marginBottom: 10,
  },
  hiddenBonusText: {
    fontSize: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    minHeight: 50,
  },
  useEquipButton: {
    backgroundColor: "#8E44AD",
  },
  sellButton: {
    backgroundColor: "#2ECC71",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  sellPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  coinIconSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC800",
    marginRight: 3,
  },
  sellPriceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
