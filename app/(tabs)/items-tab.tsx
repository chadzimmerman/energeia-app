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
  // Add a visual indicator if the item is equipped
  const isEquippedStyle = item.is_equipped ? styles.equippedBorder : {};

  return (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { width: cardSize, height: cardSize * 1.5 },
        isEquippedStyle, // Apply green border if equipped
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={item.imageSource}
        style={styles.itemImage}
        resizeMode="contain"
      />

      {/* Item Price/Energeia */}
      <ThemedView style={styles.priceContainer}>
        <View style={styles.coinIcon} />
        <ThemedText style={styles.priceText}>{item.energeiaNumber}</ThemedText>
      </ThemedView>

      {/* Lock Icon (if locked) */}
      {item.isLocked && (
        <View style={styles.lockIconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
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
      // Supabase JOIN query: user_inventory (id, is_equipped) JOIN items_master
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
`
        )
        .eq("user_id", currentUserId);

      if (error) throw error;

      const liveInventory: Item[] = data
        .map((record) => {
          const itemMaster = record.item as any;

          // ... (check itemMaster is not null) ...

          return {
            // ... user_inventory data ...
            id: record.id,
            is_equipped: record.is_equipped,
            isLocked: record.is_locked,

            // items_master data
            item_id: itemMaster.id,
            name: itemMaster.name,
            energeiaNumber: itemMaster.base_energeia_cost,
            type: itemMaster.type,
            flavorText: itemMaster.flavor_text,
            description: itemMaster.description,
            requiredClass: itemMaster.required_class,

            // 🌟 ADD THIS LINE 🌟
            imageSource:
              ResolvedImageSourceMap[itemMaster.id] || DEFAULT_IMAGE_SOURCE,

            // ... You also need the hiddenBonus data mapped here ...
            hiddenBonus: {
              stat: itemMaster.hidden_stat_type,
              buff: itemMaster.hidden_buff_value,
            },
          } as Item;
        })
        .filter((item) => item !== null) as Item[];

      setInventory(liveInventory);
    } catch (e: any) {
      console.error("Inventory Fetch Error:", e.message);
    }
  }, []); // Dependencies are stable

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
    }, [userId, fetchProfile, fetchInventory])
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
        profile.max_energeia
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
            profile.max_energeia
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
  // ... (rest of the styles are the same)
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

// import CharacterStats from "@/components/CharacterStats";
// import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
// import { supabase } from "@/utils/supabase";
// import { useFocusEffect } from "expo-router";
// import React, { useCallback, useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Dimensions,
//   Image,
//   ImageSourcePropType,
//   Modal,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// // --- MOCK DATA & TYPES ---

// // Define the structure for an item
// interface Item {
//   id: string; // The user_inventory row ID
//   item_id: string; // The actual item type ID
//   name: string;
//   energeiaNumber: number; // Base value
//   is_equipped: boolean; // Tracking equipped state

//   // Local/Metadata properties
//   imageSource: any;
//   type: "consumable" | "equippable";
//   flavorText: string;
//   description: string;
//   hiddenBonus: {
//     stat: "energeia" | "defense" | "health";
//     buff: number;
//   };
// }

// interface Profile {
//   id: string;
//   username: string;
//   current_health: number;
//   max_health: number;
//   current_energeia: number; // This is the currency
//   max_energeia: number;
//   character_image_path: string;
// }

// // Get screen width to calculate responsive card size (for 2 columns with padding)
// const screenWidth = Dimensions.get("window").width;
// const cardSize = (screenWidth - 20 * 3) / 2; // 20px padding on left, right, and between cards

// const mockItems: Item[] = [
//   {
//     id: "1",
//     name: "Bear Companion",
//     imageSource: require("../../assets/sprites/animals/baby-bear.png"),
//     energeiaNumber: 25,
//     isLocked: false,
//     type: "equippable",
//     flavorText: "A furry friend in the monastic tradition.",
//     description: "Instantly restores 5 Energeia.",
//     hiddenBonus: { stat: "energeia", buff: 5 },
//   },
//   {
//     id: "2",
//     name: "Icon of the Theotokos",
//     imageSource: require("../../assets/sprites/icons/theotokos-icon.png"),
//     energeiaNumber: 100,
//     isLocked: false,
//     type: "equippable",
//     flavorText: "A holy relic inspiring steadfast devotion.",
//     description: "Grants +15 Energeia passively when equipped.",
//     hiddenBonus: { stat: "energeia", buff: 15 },
//   },
//   {
//     id: "3",
//     name: "Novice Sword",
//     imageSource: require("../../assets/sprites/items/sword.png"),
//     energeiaNumber: 20,
//     isLocked: true,
//     type: "equippable",
//     flavorText: "Simple and true, for a novice's journey.",
//     description: "A minor physical damage buff to combat tasks.",
//     hiddenBonus: { stat: "energeia", buff: 8 },
//   },
//   {
//     id: "4",
//     name: "Warrior Helmet",
//     imageSource: require("../../assets/sprites/items/warrior-helmet.png"),
//     energeiaNumber: 30,
//     isLocked: true,
//     type: "equippable",
//     flavorText: "Sturdy headgear for the trials ahead.",
//     description: "Grants +10 Defense.",
//     hiddenBonus: { stat: "defense", buff: 10 },
//   },
//   {
//     id: "5",
//     name: "Great Schema Robes",
//     imageSource: require("../../assets/sprites/items/great-schema-robes.png"),
//     energeiaNumber: 15,
//     isLocked: false,
//     type: "equippable",
//     flavorText: "The tattered habit of a fully committed monk.",
//     description: "Slightly increases Energeia regeneration rate.",
//     hiddenBonus: { stat: "energeia", buff: 3 },
//   },
//   {
//     id: "6",
//     name: "Crusader Shield",
//     imageSource: require("../../assets/sprites/items/shield.png"),
//     energeiaNumber: 20,
//     isLocked: true,
//     type: "equippable",
//     flavorText: "Used to deflect both physical and spiritual attacks.",
//     description: "Grants +4 Defense.",
//     hiddenBonus: { stat: "defense", buff: 4 },
//   },
//   {
//     id: "7",
//     name: "Skull Relic",
//     imageSource: require("../../assets/sprites/items/relic-skull.png"),
//     energeiaNumber: 30,
//     isLocked: false,
//     type: "equippable",
//     flavorText: "Memento mori - reminder of our mortal coil.",
//     description: "Focuses the mind, boosting Energeia by 6.",
//     hiddenBonus: { stat: "energeia", buff: 6 },
//   },
//   {
//     id: "8",
//     name: "Chotki Prayer Beads",
//     imageSource: require("../../assets/sprites/items/chotki.png"),
//     energeiaNumber: 30,
//     isLocked: false,
//     type: "equippable",
//     flavorText: "Used by the Hesychasts for generations to reach the infinte.",
//     description:
//       "Improves meditation and provides a substantial Energeia buff.",
//     hiddenBonus: { stat: "energeia", buff: 12 },
//   },
//   {
//     id: "9",
//     name: "Beeswax Candle",
//     imageSource: require("../../assets/sprites/items/candle.png"),
//     energeiaNumber: 15,
//     isLocked: false,
//     type: "consumable",
//     flavorText: "A small light against the spiritual darkness.",
//     description: "Consumable. Provides a temporary Energeia boost (+2 buff).",
//     hiddenBonus: { stat: "energeia", buff: 2 },
//   },
//   {
//     id: "10",
//     name: "Old Philokalia",
//     imageSource: require("../../assets/sprites/items/philokalia.png"),
//     energeiaNumber: 90,
//     isLocked: true,
//     type: "equippable",
//     flavorText: "A collection of spiritual writings from the Holy Mountain.",
//     description: "The ultimate source of wisdom. Massive Energeia boost.",
//     hiddenBonus: { stat: "energeia", buff: 18 },
//   },
// ];

// // --- UTILITIES ---
// // Helper to look up item metadata from the mock list (which acts as our "item definitions" table)
// const getItemMetadata = (itemId: string) => {
//   // Finds the full item definition (metadata) using the item_id from the inventory record
//   return mockItems.find((item) => item.id === itemId);
// };

// // Define the default local image path for comparison
// const DEFAULT_IMAGE_PATH =
//   "../../assets/sprites/characters/monk/novice-monk-male.png";

// // Helper function to resolve the image source correctly
// const resolveImageSource = (path: string): ImageSourcePropType => {
//   // If the path matches the default local path from the DB
//   if (path.includes("novice-monk-male.png")) {
//     // Use require() for the local static asset
//     return require(DEFAULT_IMAGE_PATH);
//   }
//   // Otherwise, assume it's a remote URL (like from Supabase Storage)
//   return { uri: path };
// };

// // --- COMPONENTS ---

// /**
//  * Renders the modal that pops up when an item is clicked.
//  */
// const ItemDetailsModal: React.FC<{
//   isVisible: boolean;
//   item: Item | null;
//   onClose: () => void;
//   // Mock player currency for display
//   playerEnergeia: number;
// }> = ({ isVisible, item, onClose, playerEnergeia }) => {
//   if (!item) return null;

//   const handleUseEquip = () => {
//     // Logic to use (if consumable) or equip (if equippable)
//     const action = item.type === "consumable" ? "used" : "equipped";
//     console.log(
//       `${item.name} has been ${action}. Hidden bonus: ${item.hiddenBonus.stat} +${item.hiddenBonus.buff}`
//     );
//     onClose();
//   };

//   const handleSell = () => {
//     // Logic to sell the item (e.g., for half its purchase price)
//     const sellPrice = Math.floor(item.energeiaNumber / 2);
//     console.log(`${item.name} sold for ${sellPrice} Energeia.`);
//     onClose();
//   };

//   // Determine button text based on item type
//   const useEquipText = item.type === "consumable" ? "Use" : "Equip";
//   const sellPrice = Math.floor(item.energeiaNumber / 2);
//   const buyPrice = item.energeiaNumber; // Assume full price if buying is ever re-enabled

//   return (
//     <Modal
//       transparent={true}
//       visible={isVisible}
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       {/* Background Dimmer/Overlay - Clicking this calls onClose */}
//       <TouchableOpacity
//         style={modalStyles.overlay}
//         activeOpacity={1}
//         onPress={onClose} // Close the modal when touching the background
//       >
//         {/* Modal Content - Stop propagation to prevent closing when pressing inside the card */}
//         <ThemedView
//           style={modalStyles.modalView}
//           onStartShouldSetResponder={() => true}
//         >
//           {/* Top Currency Display (Energeia) */}
//           <View style={modalStyles.currencyDisplay}>
//             {/* Player's Current Energeia */}
//             <View style={modalStyles.currencyChip}>
//               <View style={modalStyles.coinIcon} />
//               <Text style={modalStyles.currencyText}>{playerEnergeia}</Text>
//             </View>
//           </View>

//           {/* Item Image */}
//           <Image
//             source={
//               item.imageSource || {
//                 uri: "https://placehold.co/100x100/A0A0A0/FFFFFF/png?text=Item",
//               }
//             }
//             style={modalStyles.itemImage}
//             resizeMode="contain"
//           />

//           {/* Item Name */}
//           <ThemedText style={modalStyles.itemName}>{item.name}</ThemedText>

//           {/* Flavor Text and Description */}
//           <ThemedText style={modalStyles.itemFlavorText}>
//             {item.flavorText}
//           </ThemedText>
//           <ThemedText style={modalStyles.itemDescription}>
//             {item.description}
//           </ThemedText>

//           {/* Hidden Bonus (Displayed only for dev/debug purposes here, but hidden from user visually) */}
//           {/* We'll use a style that mimics the structure but hides the content, as requested */}
//           <View style={modalStyles.hiddenBonusBox}>
//             <ThemedText style={modalStyles.hiddenBonusText}>
//               Hidden Bonus: +{item.hiddenBonus.buff} {item.hiddenBonus.stat}
//             </ThemedText>
//           </View>

//           {/* Action Buttons */}
//           <View style={modalStyles.buttonRow}>
//             {/* Use/Equip Button (Replaces "Close" from screenshot) */}
//             <TouchableOpacity
//               style={[modalStyles.actionButton, modalStyles.useEquipButton]}
//               onPress={handleUseEquip}
//               disabled={item.isLocked} // Disable if locked
//             >
//               <Text style={modalStyles.buttonText}>{useEquipText}</Text>
//             </TouchableOpacity>

//             {/* Sell Button (Replaces "Buy" from screenshot) */}
//             <TouchableOpacity
//               style={[modalStyles.actionButton, modalStyles.sellButton]}
//               onPress={handleSell}
//             >
//               <Text style={modalStyles.buttonText}>Sell</Text>
//               {/* Energeia Icon and Sell Price */}
//               <View style={modalStyles.sellPriceContainer}>
//                 <View style={modalStyles.coinIconSmall} />
//                 <Text style={modalStyles.sellPriceText}>{sellPrice}</Text>
//               </View>
//             </TouchableOpacity>
//           </View>
//         </ThemedView>
//       </TouchableOpacity>
//     </Modal>
//   );
// };

// /**
//  * Renders a single item card with its image, price, and lock status.
//  */
// const ItemCard: React.FC<{ item: Item; onPress: (item: Item) => void }> = ({
//   item,
//   onPress,
// }) => {
//   return (
//     <TouchableOpacity
//       style={[styles.itemCard, { width: cardSize, height: cardSize * 1.5 }]} // Tall aspect ratio like the screenshot
//       onPress={() => onPress(item)} // Open modal on press
//       activeOpacity={0.7}
//     >
//       <Image
//         // Use a standard placeholder if the asset path doesn't work in the user's environment
//         source={
//           item.imageSource || {
//             uri: "https://placehold.co/60x60/A0A0A0/FFFFFF/png?text=Item",
//           }
//         }
//         style={styles.itemImage}
//         resizeMode="contain"
//       />

//       {/* Item Price/Energeia */}
//       <ThemedView style={styles.priceContainer}>
//         {/* Coin Icon - using a simple circle for the coin */}
//         <View style={styles.coinIcon} />
//         <ThemedText style={styles.priceText}>{item.energeiaNumber}</ThemedText>
//       </ThemedView>

//       {/* Lock Icon (if locked) */}
//       {item.isLocked && (
//         <View style={styles.lockIconContainer}>
//           {/* Using Unicode for lock icon, as we can't assume FontAwesome/VectorIcons are installed */}
//           <Text style={styles.lockIcon}>🔒</Text>
//         </View>
//       )}
//     </TouchableOpacity>
//   );
// };

// /**
//  * Renders the main item grid structure including the "Reward yourself" header.
//  */
// const ItemGrid: React.FC<{ onSelectItem: (item: Item) => void }> = ({
//   onSelectItem,
// }) => {
//   // Hardcoded player currency for display in the grid header
//   const mockPlayerEnergeia = 20;

//   return (
//     <ScrollView
//       style={styles.gridContainer}
//       contentContainerStyle={styles.gridContent}
//     >
//       {/* Energy/Gem Indicators (Mock up from the screenshot - top right) */}
//       <View style={styles.currencyRow}>
//         <View style={styles.currencyChip}>
//           <View style={styles.coinIcon} />
//           <Text style={styles.currencyText}>{mockPlayerEnergeia}</Text>
//         </View>
//       </View>

//       {/* Item Grid */}
//       <View style={styles.itemGridWrap}>
//         {mockItems.map((item) => (
//           <ItemCard key={item.id} item={item} onPress={onSelectItem} />
//         ))}
//       </View>
//     </ScrollView>
//   );
// };

// // --- MAIN TAB SCREEN ---

// export default function ItemsTabScreen() {
//   const [selectedItem, setSelectedItem] = useState<Item | null>(null);
//   const [isModalVisible, setIsModalVisible] = useState(false);
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const [inventory, setInventory] = useState<Item[]>([]);
//   const [userId, setUserId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   const fetchProfile = useCallback(async (currentUserId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", currentUserId)
//         .single();

//       if (error) throw error;
//       setProfile(data as Profile);
//     } catch (e: any) {
//       console.error("Profile Fetch Error:", e.message);
//     }
//   }, []);

//   const fetchInventory = useCallback(async (currentUserId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("user_inventory") // Assuming this is your inventory table name
//         .select("id, item_id, is_equipped") // Fetch user-specific inventory columns
//         .eq("user_id", currentUserId);

//       if (error) throw error;

//       // Map DB inventory data to the full Item structure (combining DB state with metadata)
//       const liveInventory: Item[] = data
//         .map((record) => {
//           const metadata = getItemMetadata(record.item_id);

//           // If metadata is found, merge it with the inventory state
//           if (metadata) {
//             return {
//               ...metadata, // Contains name, imageSource, energeiaNumber, etc.
//               id: record.id, // OVERWRITE ID: Use the user_inventory row ID for updates/selling
//               is_equipped: record.is_equipped,
//             } as Item;
//           }
//           // If no metadata found (item ID is bad), return a placeholder/null
//           return null;
//         })
//         .filter((item) => item !== null) as Item[];

//       setInventory(liveInventory);
//     } catch (e: any) {
//       console.error("Inventory Fetch Error:", e.message);
//     }
//   }, []);

//   // --- INITIAL AUTH & REFRESH ---

//   // 1. Initial Auth/Setup
//   useEffect(() => {
//     const setup = async () => {
//       setLoading(true);
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();
//       const user =
//         session?.user || (await supabase.auth.signInAnonymously()).data.user;

//       if (user?.id) {
//         setUserId(user.id);
//         // We will call fetchProfile and fetchInventory in useFocusEffect for consistency
//       } else {
//         console.error("User ID not found after authentication.");
//       }
//       setLoading(false);
//     };
//     setup();
//   }, []);

//   // 2. Refresh on Focus (When the tab is opened/comes into view)
//   useFocusEffect(
//     useCallback(() => {
//       if (userId) {
//         // Fetch both profile and inventory every time the screen is focused
//         fetchProfile(userId);
//         fetchInventory(userId);
//       }
//       return () => {}; // Cleanup function
//     }, [userId, fetchProfile, fetchInventory])
//   );

//   // --- HANDLERS (UPDATED TO BE LIVE) ---

//   const handleSelectItem = (item: Item) => {
//     setSelectedItem(item);
//     setIsModalVisible(true);
//   };

//   const handleCloseModal = () => {
//     setIsModalVisible(false);
//     setSelectedItem(null);
//   };

//   // 3. LIVE SELL LOGIC
//   const handleSell = async (item: Item) => {
//     if (!userId || !profile) return;

//     try {
//       // 1. Calculate Sell Price and New Energeia
//       const sellPrice = Math.floor(item.energeiaNumber / 2);
//       const newEnergeia = profile.current_energeia + sellPrice;
//       const maxEnergeia = profile.max_energeia;

//       // Cap the new Energeia level
//       const finalEnergeia = Math.min(newEnergeia, maxEnergeia);

//       // 2. Database Transaction
//       await supabase
//         .from("profiles")
//         .update({ current_energeia: finalEnergeia })
//         .eq("id", userId);

//       await supabase.from("user_inventory").delete().eq("id", item.id); // Delete the specific inventory row

//       // 3. Refresh State
//       await fetchProfile(userId);
//       await fetchInventory(userId);

//       // Log success and close modal
//       console.log(
//         `${item.name} sold for ${sellPrice} Energeia. New Energeia: ${finalEnergeia}`
//       );
//       handleCloseModal();
//     } catch (e: any) {
//       console.error("Sell Item Error:", e.message);
//     }
//   };

//   // 4. MOCK Use/Equip Logic (Needs full implementation later, but we update profile/inventory)
//   const handleUseEquip = async (item: Item) => {
//     if (!userId || !profile) return;

//     // A. EQUIP/UNEQUIP (If Equippable)
//     if (item.type === "equippable") {
//       // Simple Toggle: Find all items with this item_id and toggle their equipped status
//       const newState = !item.is_equipped;

//       await supabase
//         .from("user_inventory")
//         .update({ is_equipped: newState })
//         .eq("id", item.id);
//     }
//     // B. CONSUMABLE LOGIC (If Consumable) - Instant stat change, then deletion
//     else if (item.type === "consumable") {
//       // Apply immediate stat buff (only handles Energeia buff for now)
//       if (item.hiddenBonus.stat === "energeia") {
//         const buff = item.hiddenBonus.buff;
//         const newEnergeia = Math.min(
//           profile.current_energeia + buff,
//           profile.max_energeia
//         );

//         await supabase
//           .from("profiles")
//           .update({ current_energeia: newEnergeia })
//           .eq("id", userId);

//         // Delete consumable item from inventory
//         await supabase.from("user_inventory").delete().eq("id", item.id);
//       }
//     }

//     // Refresh both sets of data to show the equipped status change or deletion/stat buff
//     await fetchProfile(userId);
//     await fetchInventory(userId);
//     handleCloseModal();
//   };

//   if (loading || !profile) {
//     return (
//       <ThemedView style={styles.container}>
//         <ActivityIndicator
//           size="large"
//           color="#0000ff"
//           style={styles.loading}
//         />
//         <ThemedText style={styles.text}>Loading Inventory...</ThemedText>
//       </ThemedView>
//     );
//   }

//   return (
//     <ThemedView style={styles.container}>
//       {/* 1. Character Stats Header (Using live profile data) */}
//       <CharacterStats
//         backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
//         characterImageSource={resolveImageSource(profile.character_image_path)}
//         currentHealth={profile.current_health}
//         maxHealth={profile.max_health}
//         currentEnergy={profile.current_energeia}
//         maxEnergy={profile.max_energeia}
//       />

//       {/* 2. Item Grid (Passing live inventory) */}
//       <ItemGrid
//         onSelectItem={handleSelectItem}
//         inventory={inventory} // Pass live inventory to a modified ItemGrid
//         playerEnergeia={profile.current_energeia} // Pass live currency
//       />

//       {/* 3. Item Details Modal */}
//       <ItemDetailsModal
//         isVisible={isModalVisible}
//         item={selectedItem}
//         onClose={handleCloseModal}
//         playerEnergeia={profile.current_energeia} // Pass live currency
//         // Pass the live handlers
//         handleSell={handleSell}
//         handleUseEquip={handleUseEquip}
//       />
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     // The main container should fill the screen
//   },
//   // --- Item Grid Styles ---
//   gridContainer: {
//     flex: 1,
//     paddingHorizontal: 10,
//     backgroundColor: "transparent", // Ensure it blends with the background if needed
//   },
//   gridContent: {
//     paddingBottom: 20, // Space at the bottom for scrolling
//   },
//   itemGridWrap: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between", // Distribute items horizontally
//     marginHorizontal: 10, // Left/Right padding to match the card gap
//   },
//   rewardsHeader: {
//     fontSize: 22,
//     fontWeight: "bold",
//     marginTop: 15,
//     marginHorizontal: 10,
//     color: "#333", // Dark text color
//   },
//   rewardsSubtitle: {
//     fontSize: 14,
//     color: "#666", // Grey subtitle
//     marginBottom: 10,
//     marginHorizontal: 10,
//   },
//   currencyRow: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     marginBottom: 15,
//     marginRight: 10,
//   },
//   currencyChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 999,
//     paddingVertical: 5,
//     paddingHorizontal: 12,
//     marginLeft: 8,
//     borderWidth: 1,
//     borderColor: "#eee",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 1,
//     elevation: 2,
//   },
//   currencyText: {
//     marginLeft: 4,
//     fontWeight: "600",
//     color: "#333",
//     fontSize: 14,
//   },
//   // --- Item Card Styles ---
//   itemCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "#eee",
//     marginBottom: 20, // Vertical spacing between rows
//     alignItems: "center",
//     justifyContent: "space-between", // Push image to top, price to bottom
//     paddingTop: 15,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//     // The width/height are set inline in the component based on cardSize
//   },
//   itemImage: {
//     width: "70%",
//     height: "60%",
//     marginBottom: 5,
//   },
//   priceContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#FBE8B5", // Light yellow/orange background for the price bubble
//     paddingHorizontal: 15,
//     paddingVertical: 4,
//     borderRadius: 999,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: "#FBD28B", // Darker border
//   },
//   coinIcon: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: "#FFC800", // Gold color for the coin icon
//     marginRight: 5,
//   },
//   priceText: {
//     fontSize: 14,
//     fontWeight: "bold",
//     color: "#A06E00", // Dark text for contrast
//   },
//   lockIconContainer: {
//     position: "absolute",
//     top: 5,
//     right: 5,
//     backgroundColor: "rgba(255, 255, 255, 0.9)",
//     borderRadius: 10,
//     padding: 3,
//     borderWidth: 1,
//     borderColor: "#ccc",
//   },
//   lockIcon: {
//     fontSize: 14,
//   },
// });

// // --- MODAL STYLES ---

// const modalStyles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(0, 0, 0, 0.65)", // Darker colored background as requested
//   },
//   modalView: {
//     width: "85%", // Occupy most of the screen width
//     backgroundColor: "white",
//     borderRadius: 15,
//     padding: 20,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 5,
//     position: "relative",
//   },
//   currencyDisplay: {
//     position: "absolute",
//     top: 15,
//     right: 15,
//     flexDirection: "row",
//     gap: 8,
//   },
//   currencyChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 999,
//     paddingVertical: 5,
//     paddingHorizontal: 10,
//     borderWidth: 1,
//     borderColor: "#eee",
//   },
//   coinIcon: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: "#FFC800", // Gold color for Energeia coin
//     marginRight: 4,
//   },
//   currencyText: {
//     fontWeight: "600",
//     color: "#333",
//     fontSize: 16,
//   },
//   itemImage: {
//     width: 100,
//     height: 100,
//     marginTop: 20, // Space below the currency chips
//     marginBottom: 15,
//   },
//   itemName: {
//     fontSize: 22,
//     fontWeight: "bold",
//     marginBottom: 10,
//     color: "#333",
//     textAlign: "center",
//   },
//   itemFlavorText: {
//     fontSize: 14,
//     color: "#666",
//     textAlign: "center",
//     marginBottom: 8,
//     paddingHorizontal: 10,
//   },
//   itemDescription: {
//     fontSize: 14,
//     color: "#333",
//     textAlign: "center",
//     fontWeight: "500",
//     marginBottom: 15,
//     paddingHorizontal: 10,
//   },
//   // Style for the hidden bonus to be visually small/hidden for a user, but present in the component tree
//   hiddenBonusBox: {
//     height: 15, // Make it very small
//     opacity: 0.01, // Nearly invisible
//     overflow: "hidden",
//     marginBottom: 10,
//   },
//   hiddenBonusText: {
//     fontSize: 10,
//   },
//   buttonRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     width: "100%",
//     paddingHorizontal: 10,
//     marginTop: 20,
//   },
//   actionButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     marginHorizontal: 5,
//     minHeight: 50,
//   },
//   useEquipButton: {
//     backgroundColor: "#8E44AD", // Purple/Violet color for Use/Equip
//   },
//   sellButton: {
//     backgroundColor: "#2ECC71", // Green color for Sell
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   buttonText: {
//     color: "white",
//     fontSize: 16,
//     fontWeight: "bold",
//   },
//   sellPriceContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   coinIconSmall: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: "#FFC800",
//     marginRight: 3,
//   },
//   sellPriceText: {
//     color: "white",
//     fontSize: 16,
//     fontWeight: "bold",
//   },
// });
