import React, { useState } from "react";
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

// Assuming CharacterStats is imported from "@/components/CharacterStats"
import CharacterStats from "@/components/CharacterStats";
// Assuming View and Text from Themed are used for potential theme support
import { Text as ThemedText, View as ThemedView } from "@/components/Themed";

// --- MOCK DATA & TYPES ---

// Define the structure for an item
interface Item {
  id: string;
  name: string;
  imageSource: any; // Use 'any' for local image `require` paths
  energeiaNumber: number;
  isLocked: boolean;
  type: "consumable" | "equippable";
  flavorText: string;
  description: string;
  // This is the hidden bonus mentioned by the user
  hiddenBonus: {
    stat: "energeia" | "defense" | "health";
    buff: number;
  };
}

// Get screen width to calculate responsive card size (for 2 columns with padding)
const screenWidth = Dimensions.get("window").width;
const cardSize = (screenWidth - 20 * 3) / 2; // 20px padding on left, right, and between cards

const mockItems: Item[] = [
  {
    id: "1",
    name: "Bear Companion",
    imageSource: require("../../assets/sprites/animals/baby-bear.png"),
    energeiaNumber: 25,
    isLocked: false,
    type: "equippable",
    flavorText: "A furry friend in the monastic tradition.",
    description: "Instantly restores 5 Energeia.",
    hiddenBonus: { stat: "energeia", buff: 5 },
  },
  {
    id: "2",
    name: "Icon of the Theotokos",
    imageSource: require("../../assets/sprites/icons/theotokos-icon.png"),
    energeiaNumber: 100,
    isLocked: false,
    type: "equippable",
    flavorText: "A holy relic inspiring steadfast devotion.",
    description: "Grants +15 Energeia passively when equipped.",
    hiddenBonus: { stat: "energeia", buff: 15 },
  },
  {
    id: "3",
    name: "Novice Sword",
    imageSource: require("../../assets/sprites/items/sword.png"),
    energeiaNumber: 20,
    isLocked: true,
    type: "equippable",
    flavorText: "Simple and true, for a novice's journey.",
    description: "A minor physical damage buff to combat tasks.",
    hiddenBonus: { stat: "energeia", buff: 8 },
  },
  {
    id: "4",
    name: "Warrior Helmet",
    imageSource: require("../../assets/sprites/items/warrior-helmet.png"),
    energeiaNumber: 30,
    isLocked: true,
    type: "equippable",
    flavorText: "Sturdy headgear for the trials ahead.",
    description: "Grants +10 Defense.",
    hiddenBonus: { stat: "defense", buff: 10 },
  },
  {
    id: "5",
    name: "Great Schema Robes",
    imageSource: require("../../assets/sprites/items/great-schema-robes.png"),
    energeiaNumber: 15,
    isLocked: false,
    type: "equippable",
    flavorText: "The tattered habit of a fully committed monk.",
    description: "Slightly increases Energeia regeneration rate.",
    hiddenBonus: { stat: "energeia", buff: 3 },
  },
  {
    id: "6",
    name: "Crusader Shield",
    imageSource: require("../../assets/sprites/items/shield.png"),
    energeiaNumber: 20,
    isLocked: true,
    type: "equippable",
    flavorText: "Used to deflect both physical and spiritual attacks.",
    description: "Grants +4 Defense.",
    hiddenBonus: { stat: "defense", buff: 4 },
  },
  {
    id: "7",
    name: "Skull Relic",
    imageSource: require("../../assets/sprites/items/relic-skull.png"),
    energeiaNumber: 30,
    isLocked: false,
    type: "equippable",
    flavorText: "Memento mori - reminder of our mortal coil.",
    description: "Focuses the mind, boosting Energeia by 6.",
    hiddenBonus: { stat: "energeia", buff: 6 },
  },
  {
    id: "8",
    name: "Chotki Prayer Beads",
    imageSource: require("../../assets/sprites/items/chotki.png"),
    energeiaNumber: 30,
    isLocked: false,
    type: "equippable",
    flavorText: "Used by the Hesychasts for generations to reach the infinte.",
    description:
      "Improves meditation and provides a substantial Energeia buff.",
    hiddenBonus: { stat: "energeia", buff: 12 },
  },
  {
    id: "9",
    name: "Beeswax Candle",
    imageSource: require("../../assets/sprites/items/candle.png"),
    energeiaNumber: 15,
    isLocked: false,
    type: "consumable",
    flavorText: "A small light against the spiritual darkness.",
    description: "Consumable. Provides a temporary Energeia boost (+2 buff).",
    hiddenBonus: { stat: "energeia", buff: 2 },
  },
  {
    id: "10",
    name: "Old Philokalia",
    imageSource: require("../../assets/sprites/items/philokalia.png"),
    energeiaNumber: 90,
    isLocked: true,
    type: "equippable",
    flavorText: "A collection of spiritual writings from the Holy Mountain.",
    description: "The ultimate source of wisdom. Massive Energeia boost.",
    hiddenBonus: { stat: "energeia", buff: 18 },
  },
];

// --- COMPONENTS ---

/**
 * Renders the modal that pops up when an item is clicked.
 */
const ItemDetailsModal: React.FC<{
  isVisible: boolean;
  item: Item | null;
  onClose: () => void;
  // Mock player currency for display
  playerEnergeia: number;
}> = ({ isVisible, item, onClose, playerEnergeia }) => {
  if (!item) return null;

  const handleUseEquip = () => {
    // Logic to use (if consumable) or equip (if equippable)
    const action = item.type === "consumable" ? "used" : "equipped";
    console.log(
      `${item.name} has been ${action}. Hidden bonus: ${item.hiddenBonus.stat} +${item.hiddenBonus.buff}`
    );
    onClose();
  };

  const handleSell = () => {
    // Logic to sell the item (e.g., for half its purchase price)
    const sellPrice = Math.floor(item.energeiaNumber / 2);
    console.log(`${item.name} sold for ${sellPrice} Energeia.`);
    onClose();
  };

  // Determine button text based on item type
  const useEquipText = item.type === "consumable" ? "Use" : "Equip";
  const sellPrice = Math.floor(item.energeiaNumber / 2);
  const buyPrice = item.energeiaNumber; // Assume full price if buying is ever re-enabled

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
          {/* Top Currency Display (Energeia) */}
          <View style={modalStyles.currencyDisplay}>
            {/* Player's Current Energeia */}
            <View style={modalStyles.currencyChip}>
              <View style={modalStyles.coinIcon} />
              <Text style={modalStyles.currencyText}>{playerEnergeia}</Text>
            </View>
          </View>

          {/* Item Image */}
          <Image
            source={
              item.imageSource || {
                uri: "https://placehold.co/100x100/A0A0A0/FFFFFF/png?text=Item",
              }
            }
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

          {/* Hidden Bonus (Displayed only for dev/debug purposes here, but hidden from user visually) */}
          {/* We'll use a style that mimics the structure but hides the content, as requested */}
          <View style={modalStyles.hiddenBonusBox}>
            <ThemedText style={modalStyles.hiddenBonusText}>
              Hidden Bonus: +{item.hiddenBonus.buff} {item.hiddenBonus.stat}
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={modalStyles.buttonRow}>
            {/* Use/Equip Button (Replaces "Close" from screenshot) */}
            <TouchableOpacity
              style={[modalStyles.actionButton, modalStyles.useEquipButton]}
              onPress={handleUseEquip}
              disabled={item.isLocked} // Disable if locked
            >
              <Text style={modalStyles.buttonText}>{useEquipText}</Text>
            </TouchableOpacity>

            {/* Sell Button (Replaces "Buy" from screenshot) */}
            <TouchableOpacity
              style={[modalStyles.actionButton, modalStyles.sellButton]}
              onPress={handleSell}
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
      style={[styles.itemCard, { width: cardSize, height: cardSize * 1.5 }]} // Tall aspect ratio like the screenshot
      onPress={() => onPress(item)} // Open modal on press
      activeOpacity={0.7}
    >
      <Image
        // Use a standard placeholder if the asset path doesn't work in the user's environment
        source={
          item.imageSource || {
            uri: "https://placehold.co/60x60/A0A0A0/FFFFFF/png?text=Item",
          }
        }
        style={styles.itemImage}
        resizeMode="contain"
      />

      {/* Item Price/Energeia */}
      <ThemedView style={styles.priceContainer}>
        {/* Coin Icon - using a simple circle for the coin */}
        <View style={styles.coinIcon} />
        <ThemedText style={styles.priceText}>{item.energeiaNumber}</ThemedText>
      </ThemedView>

      {/* Lock Icon (if locked) */}
      {item.isLocked && (
        <View style={styles.lockIconContainer}>
          {/* Using Unicode for lock icon, as we can't assume FontAwesome/VectorIcons are installed */}
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Renders the main item grid structure including the "Reward yourself" header.
 */
const ItemGrid: React.FC<{ onSelectItem: (item: Item) => void }> = ({
  onSelectItem,
}) => {
  // Hardcoded player currency for display in the grid header
  const mockPlayerEnergeia = 20;

  return (
    <ScrollView
      style={styles.gridContainer}
      contentContainerStyle={styles.gridContent}
    >
      {/* Energy/Gem Indicators (Mock up from the screenshot - top right) */}
      <View style={styles.currencyRow}>
        <View style={styles.currencyChip}>
          <View style={styles.coinIcon} />
          <Text style={styles.currencyText}>{mockPlayerEnergeia}</Text>
        </View>
      </View>

      {/* Item Grid */}
      <View style={styles.itemGridWrap}>
        {mockItems.map((item) => (
          <ItemCard key={item.id} item={item} onPress={onSelectItem} />
        ))}
      </View>
    </ScrollView>
  );
};

// --- MAIN TAB SCREEN ---

export default function ItemsTabScreen() {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Mock player currency for the modal display
  const playerEnergeia = 20;

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. Character Stats Header */}
      <CharacterStats
        // Note: You must ensure these assets exist in your project structure
        backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
        characterImageSource={require("../../assets/sprites/characters/monk/novice-monk-male.png")}
        currentHealth={75}
        maxHealth={100}
        currentEnergy={50}
        maxEnergy={100}
      />

      {/* 2. Item Grid */}
      <ItemGrid onSelectItem={handleSelectItem} />

      {/* 3. Item Details Modal */}
      <ItemDetailsModal
        isVisible={isModalVisible}
        item={selectedItem}
        onClose={handleCloseModal}
        playerEnergeia={playerEnergeia}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // The main container should fill the screen
  },
  // --- Item Grid Styles ---
  gridContainer: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: "transparent", // Ensure it blends with the background if needed
  },
  gridContent: {
    paddingBottom: 20, // Space at the bottom for scrolling
  },
  itemGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Distribute items horizontally
    marginHorizontal: 10, // Left/Right padding to match the card gap
  },
  rewardsHeader: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
    marginHorizontal: 10,
    color: "#333", // Dark text color
  },
  rewardsSubtitle: {
    fontSize: 14,
    color: "#666", // Grey subtitle
    marginBottom: 10,
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
  // --- Item Card Styles ---
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20, // Vertical spacing between rows
    alignItems: "center",
    justifyContent: "space-between", // Push image to top, price to bottom
    paddingTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    // The width/height are set inline in the component based on cardSize
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
    backgroundColor: "#FBE8B5", // Light yellow/orange background for the price bubble
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FBD28B", // Darker border
  },
  coinIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFC800", // Gold color for the coin icon
    marginRight: 5,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A06E00", // Dark text for contrast
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

// --- MODAL STYLES ---

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)", // Darker colored background as requested
  },
  modalView: {
    width: "85%", // Occupy most of the screen width
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
    backgroundColor: "#FFC800", // Gold color for Energeia coin
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
    marginTop: 20, // Space below the currency chips
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
  // Style for the hidden bonus to be visually small/hidden for a user, but present in the component tree
  hiddenBonusBox: {
    height: 15, // Make it very small
    opacity: 0.01, // Nearly invisible
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
    backgroundColor: "#8E44AD", // Purple/Violet color for Use/Equip
  },
  sellButton: {
    backgroundColor: "#2ECC71", // Green color for Sell
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
