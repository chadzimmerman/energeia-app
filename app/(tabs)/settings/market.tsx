import { supabase } from "@/utils/supabase";
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

// --- MOCK DATA & TYPES ---

// Define the structure for an item (adding price explicitly here)
interface MarketItem {
  id: string;
  name: string;
  imageSource: any; // Use 'any' for local image `require` paths
  price: number; // Renamed from energeiaNumber to price for clarity
  isLocked: boolean;
  type: "consumable" | "equippable";
  flavorText: string;
  description: string;
  hiddenBonus: {
    stat: "energeia" | "defense" | "health";
    buff: number;
  };
}

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
    console.log("Starting purchase...");

    try {
      // 1. Insert into inventory
      const { data: invData, error: invError } = await supabase
        .from("user_inventory")
        .insert({
          user_id: userId,
          item_master_id: item.id,
        })
        .select(); // Add .select() to verify data return

      if (invError) {
        console.error("INVENTORY ERROR:", invError.message);
        alert("Inventory Error: " + invError.message);
        return;
      }

      console.log("Item added to inventory table.");

      // 2. Deduct money from profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ current_energeia: playerEnergeia - item.price })
        .eq("id", userId);

      if (profileError) {
        console.error("PROFILE ERROR:", profileError.message);
        alert("Currency Error: " + profileError.message);
        return;
      }

      console.log("Money deducted successfully.");

      // 3. Success
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
            source={{ uri: item.imageSource }} // item.imageSource is the full Supabase URL
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

          {/* Hidden Bonus (Visually hidden, kept for component consistency) */}
          <View style={modalStyles.hiddenBonusBox}>
            <ThemedText style={modalStyles.hiddenBonusText}>
              Hidden Bonus: +{item.hiddenBonus.buff} {item.hiddenBonus.stat}
            </ThemedText>
          </View>

          {/* Action Button: BUY */}
          <TouchableOpacity
            style={[
              modalStyles.buyButton,
              !canAfford && modalStyles.disabledButton, // Visually disable if cannot afford
            ]}
            onPress={handleBuy}
            disabled={!canAfford}
          >
            <Text style={modalStyles.buyButtonText}>
              {canAfford ? "BUY" : "CANNOT AFFORD"}
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
      disabled={item.isLocked} // Optional: Prevent opening locked items
    >
      <Image
        source={
          item.imageSource
            ? { uri: item.imageSource }
            : { uri: "https://placehold.co/60x60/png?text=Item" }
        }
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

      {/* Lock Overlay (if locked) */}
      {item.isLocked && (
        <View style={marketStyles.lockOverlay}>
          <FontAwesome name="lock" size={40} color="rgba(0,0,0,0.5)" />
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Renders the main item grid structure including the shop header.
 */
const MarketGrid: React.FC<{
  onSelectItem: (item: MarketItem) => void;
  playerEnergeia: number;
  items: MarketItem[];
}> = ({ onSelectItem, playerEnergeia, items }) => {
  return (
    <ScrollView
      style={marketStyles.gridContainer}
      contentContainerStyle={marketStyles.gridContent}
    >
      {/* Store Owner/Dialogue Header */}
      <View style={marketStyles.dialogueBox}>
        <Text style={marketStyles.dialogueText}>
          Welcome, Novice. Here you will find the fruits of hard labor.
        </Text>
      </View>

      {/* Item Grid - This wrapper now correctly applies the grid layout */}
      <View style={marketStyles.itemGrid}>
        {items.map((item) => (
          <MarketItemCard key={item.id} item={item} onPress={onSelectItem} />
        ))}
      </View>

      {/* Space at the bottom */}
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
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);

  const handleSelectItem = (item: MarketItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  // 2. The fetch logic is now INSIDE the component where it can see userId
  const fetchMarketItems = useCallback(async (currentUserId: string) => {
    try {
      // Get items in market
      const { data: items, error: marketError } = await supabase
        .from("items_master")
        .select("*")
        .eq("is_in_market", true);

      if (marketError) throw marketError;

      // Get user inventory to filter unique items
      const { data: userInv } = await supabase
        .from("user_inventory")
        .select("item_master_id")
        .eq("user_id", currentUserId);

      const ownedIds = userInv?.map((i) => i.item_master_id) || [];

      // Map DB columns to your MarketItem interface
      const availableItems: MarketItem[] = items
        .filter((item) => {
          // ONLY hide it if it's unique AND you already own it.
          if (item.is_unique && ownedIds.includes(item.id)) {
            return false;
          }
          return true; // Consumables (like candles) stay in the shop forever!
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          imageSource: item.image_path, // This is now a full public URL
          price: item.base_energeia_cost,
          isLocked: false,
          type: item.type,
          flavorText: item.flavor_text,
          description: item.description,
          hiddenBonus: {
            stat: item.hidden_stat_type,
            buff: item.hidden_buff_value,
          },
        }));

      setMarketItems(availableItems);
    } catch (e: any) {
      console.error("Error loading shop:", e.message);
    }
  }, []);

  // Fetch the actual profile data
  const fetchPlayerCurrency = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_energeia")
        .eq("id", currentUserId)
        .single();

      if (error) throw error;
      if (data) setPlayerEnergeia(data.current_energeia);
    } catch (e: any) {
      console.error("Error fetching market currency:", e.message);
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
          fetchPlayerCurrency(id);
          fetchMarketItems(id); // 👈 Load the items too!
        }
      };
      loadData();
    }, [fetchPlayerCurrency, fetchMarketItems]),
  );

  return (
    <ThemedView style={marketStyles.container}>
      {/* 1. Static Shop Header Image */}
      <View style={marketStyles.headerImageContainer}>
        <Image
          source={require("../../../assets/sprites/ui-elements/Orthodox Icon Shop in Warm Tones.png")}
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

      {/* 2. Item Grid (Pass live state here if needed for dialogue/logic) */}
      <MarketGrid
        onSelectItem={handleSelectItem}
        playerEnergeia={playerEnergeia}
        items={marketItems}
      />

      <MarketDetailsModal
        isVisible={isModalVisible}
        item={selectedItem}
        onClose={handleCloseModal}
        playerEnergeia={playerEnergeia}
        userId={userId}
        onPurchaseSuccess={() => {
          if (userId) {
            fetchPlayerCurrency(userId); // Refresh money
            fetchMarketItems(userId); // Refresh the shop items
          }
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
    height: 180, // Fixed height for the shop banner
    overflow: "hidden",
    position: "relative",
    borderBottomWidth: 3,
    borderBottomColor: "#5D4037", // Dark brown border for a wooden shelf look
  },
  headerImage: {
    width: "100%",
    height: "100%",
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
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
    textAlign: "center",
  },
  itemFlavorText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  hiddenBonusBox: {
    height: 1,
    opacity: 0,
    overflow: "hidden",
    marginBottom: 0,
  },
  hiddenBonusText: {
    fontSize: 10,
  },
  // --- BUY Button Specifics ---
  buyButton: {
    backgroundColor: Colors.light.tint, // Main purple color
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 15,
    flexDirection: "row",
    gap: 15,
  },
  disabledButton: {
    backgroundColor: "#E74C3C", // Red for cannot afford
    opacity: 0.8,
  },
  buyButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  priceTagText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
});
