// components/AchievementItem.tsx

import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AchievementItemProps {
  title: string;
  description: string;
  imageSource: ImageSourcePropType;
  isAchieved: boolean;
  onPress?: () => void;
}

const AchievementItem: React.FC<AchievementItemProps> = ({
  title,
  description,
  imageSource,
  isAchieved,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.itemContainer, !isAchieved && styles.lockedItem]}
      onPress={isAchieved ? onPress : undefined}
      activeOpacity={isAchieved ? 0.7 : 1}
    >
      {/* Achievement Image */}
      <Image source={imageSource} style={[styles.icon, !isAchieved && styles.lockedIcon]} />

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, !isAchieved && styles.lockedText]}>{title}</Text>
        <Text style={[styles.description, !isAchieved && styles.lockedText]}>
          {isAchieved ? description : "Not yet earned."}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    marginBottom: 1,
  },
  lockedItem: {
    backgroundColor: "#f9f9f9",
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  lockedIcon: {
    opacity: 0.35,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  lockedText: {
    color: "#bbb",
  },
});

export default AchievementItem;
