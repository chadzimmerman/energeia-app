// components/AchievementItem.tsx

import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface AchievementItemProps {
  title: string;
  description: string;
  imageSource: ImageSourcePropType; // Already resolved image source
}

const AchievementItem: React.FC<AchievementItemProps> = ({
  title,
  description,
  imageSource,
}) => {
  return (
    <View style={styles.itemContainer}>
      {/* Achievement Image */}
      <Image source={imageSource} style={styles.icon} />

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Optional: Placeholder for a count/status icon on the right */}
      <View style={styles.rightPlaceholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#fff", // White background for the item
    marginBottom: 1, // Slight separator between items
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24, // Makes the circular border style
    marginRight: 15,
    resizeMode: "cover", // Ensure the image fits well
    // Add a light gray border for the circle effect
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333", // Dark text
  },
  description: {
    fontSize: 12,
    color: "#666", // Lighter text for description
    marginTop: 2,
  },
  rightPlaceholder: {
    width: 24, // Space for a right-side icon (like the square grid icon in your image)
    height: 24,
    marginLeft: 10,
  },
});

export default AchievementItem;
