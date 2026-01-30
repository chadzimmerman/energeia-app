import React from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// Define props for the component
interface CharacterStatsProps {
  backgroundImageSource: ImageSourcePropType;
  characterImageSource: ImageSourcePropType;
  currentHealth: number;
  maxHealth: number;
  currentEnergy: number;
  maxEnergy: number;
}

const CharacterStats: React.FC<CharacterStatsProps> = ({
  backgroundImageSource,
  characterImageSource,
  currentHealth,
  maxHealth,
  currentEnergy,
  maxEnergy,
}) => {
  // Calculate bar percentages
  const healthPercent = (currentHealth / maxHealth) * 100;
  const energyPercent = (currentEnergy / maxEnergy) * 100;

  return (
    <View style={styles.container}>
      {/* 1. Background Image */}
      <Image source={backgroundImageSource} style={styles.backgroundImage} />

      {/* 2. Character Stats Card Area */}
      <View style={styles.card}>
        {/* 3. Character Image */}
        <Image source={characterImageSource} style={styles.characterImage} />

        {/* 4. Stats Bars Container */}
        <View style={styles.statsContainer}>
          {/* Health Bar (Red) */}
          <View style={styles.statRow}>
            <Image
              source={require("@/assets/sprites/ui-elements/pixel-heart-icon.png")}
              style={styles.statIcon} // New style for icons outside the bar
            />
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.barBackground,
                  { height: 35, backgroundColor: "#c5c5c5" },
                ]}
              >
                <View
                  style={[styles.healthBar, { width: `${healthPercent}%` }]}
                />
              </View>
            </View>
          </View>

          {/* Energy Bar (Gold/Yellow) */}
          <View style={styles.statRow}>
            <Image
              source={require("@/assets/sprites/ui-elements/pixel-energy-icon.png")}
              style={styles.statIcon}
            />
            <View style={styles.barWrapper}>
              <View style={[styles.barBackground, { height: 25 }]}>
                <View
                  style={[styles.energyBar, { width: `${energyPercent}%` }]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const CARD_HEIGHT = 150; // Total height of the card area

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "visible", // Important for layered elements
  },
  backgroundImage: {
    width: "100%",
    height: CARD_HEIGHT,
    resizeMode: "cover",
    position: "absolute",
    top: 0,
    left: 0,
  },
  card: {
    position: "absolute",
    top: 25,
    left: 25,
    width: width * 0.95, // Adjust width to be almost full screen
    height: CARD_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 10, // Ensure it sits on top of the background
  },
  characterImage: {
    width: 100,
    height: 100,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 10,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 20,
  },
  statsContainer: {
    position: "absolute", // Keep this to position the entire stat block relative to the card
    left: 115,
    top: 10,
    height: 100,
    justifyContent: "space-between",
    paddingVertical: 5,
    zIndex: 10,
  },
  statIcon: {
    width: 30, // Make the icons slightly larger for visibility
    height: 30,
    marginRight: 8, // Space between icon and bar
    resizeMode: "contain",
    // Remove all previous absolute positioning styles related to icons
  },
  statRow: {
    flexDirection: "row", // Align icon and bar horizontally
    alignItems: "center", // Center them vertically within the row
    marginBottom: 10, // Space between health row and energy row
  },
  barWrapper: {
    width: 200, // Fixed width for the bars to keep them uniform
  },
  barBackground: {
    position: "relative", // Keep relative for progress fill
    // height is defined inline in the component
    width: "100%", // Fill the barWrapper width
    backgroundColor: "#fff",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#666",
  },
  healthBar: {
    height: "100%",
    backgroundColor: "#C81E32", // Red color for health
  },
  energyBar: {
    height: "100%",
    backgroundColor: "#FFD700", // Gold/Yellow color for energy
  },
  healthIconAbsolute: {
    width: 25,
    height: 25,
    position: "absolute",
    left: 5, // Slight padding from the left edge of the bar
    top: 5, // Centers the 25px icon within the 35px bar (35-25)/2 = 5
    zIndex: 10, // Ensure it's on top of the progress bar fill
  },
  energyIconAbsolute: {
    width: 20,
    height: 20,
    position: "absolute",
    left: 5, // Slight padding from the left edge of the bar
    top: 2.5, // Centers the 20px icon within the 25px bar (25-20)/2 = 2.5
    zIndex: 10,
  },
  heartIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    //tintColor: "#950000", // Deep red for the heart icon
  },
  boltIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
    //tintColor: "#EEDD82", // Light gold for the bolt icon
  },
});

export default CharacterStats;
