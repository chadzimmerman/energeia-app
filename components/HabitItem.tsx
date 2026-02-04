import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// Note: Using expo-vector-icons which should be available
import Colors from "@/constants/Colors"; // Assuming this path is correct for color definitions
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Define the Habit data structure based on the new SQL table
// This interface describes the DATA object only.
interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  streak_level: number;
  // Difficulty is useful for calculating the score change (later)
  difficulty: number;
}

// Define the Props for the HabitItem component.
// This interface correctly combines the habit data object with the onScore function prop.
interface HabitItemProps {
  habit: Habit;
  // The onScore function prop accepts the habit ID and a direction ('up' or 'down')
  onScore: (habitId: string, direction: "up" | "down") => void;
  onEdit: (habit: Habit) => void;
}

/**
 * Maps the habit's streak_level to a color based on the Habitica style:
 * Red (negative streak) -> Yellow (neutral/starting) -> Green (positive streak)
 * @param streakLevel The streak_level integer from the database.
 * @returns A hex color string.
 */
const getStreakColor = (streakLevel: number): string => {
  const colorMap = {
    red: "#E85A4F", // Negative streak
    yellow: "#F4D35E", // Neutral (0)
    green: "#4CAF50", // High positive streak
    neutral: Colors?.light?.tint || "#A737FD", // Default positive
  };

  if (streakLevel > 0) {
    // If it's a very strong streak (2+), use full green
    if (streakLevel >= 2) {
      return colorMap.green;
    }
    // If it's just starting (1), use your app's purple tint
    return colorMap.neutral;
  }

  if (streakLevel === 0) {
    return colorMap.yellow;
  }

  // If streakLevel is negative (< 0)
  return colorMap.red;
};

// Use the new HabitItemProps interface here
const HabitItem: React.FC<HabitItemProps> = ({ habit, onScore, onEdit }) => {
  // Determine the color based on the habit's streak level
  const buttonColor = getStreakColor(habit.streak_level);

  return (
    // Wrap the entire visual card in a View
    <View style={styles.cardWrapper}>
      {/* 1. Negative Button (Far Left) */}
      {habit.is_negative && (
        <TouchableOpacity
          style={[
            styles.scoreButton,
            styles.leftButton,
            { backgroundColor: buttonColor },
          ]}
          onPress={() => onScore(habit.id, "down")}
        >
          <FontAwesome name="minus" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 2. Flexible Text Container (Middle) 
        CRITICAL CHANGE: Use a TouchableOpacity here and apply the onEdit prop.
        It will fill the available space between the score buttons.
      */}
      <TouchableOpacity
        style={styles.textContainer}
        onPress={() => onEdit(habit)} // Apply the onEdit handler
        activeOpacity={0.7} // Optional: Gives feedback when touching
      >
        <Text style={styles.title} numberOfLines={1}>
          {habit.title}
        </Text>
        {/* Optional: Show Difficulty (e.g., small stars) */}
        <View style={styles.difficultyContainer}>
          {Array(habit.difficulty)
            .fill(0)
            .map((_, i) => (
              <FontAwesome
                key={i}
                name="star"
                size={10}
                color="#DCDCDC"
                style={{ marginHorizontal: 1 }}
              />
            ))}
        </View>
      </TouchableOpacity>

      {/* 3. Positive Button (Far Right) */}
      {habit.is_positive && (
        <TouchableOpacity
          style={[
            styles.scoreButton,
            styles.rightButton,
            { backgroundColor: buttonColor },
          ]}
          onPress={() => onScore(habit.id, "up")}
        >
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Fallback for Colors object if not present in the project structure
const fallbackColors = {
  red: "#E85A4F",
  yellow: "#F4D35E",
  green: "#4CAF50",
  light: { tint: "#A737FD" },
};

const styles = StyleSheet.create({
  // New wrapper style to contain the whole card. Renamed from 'card' to 'cardWrapper'.
  cardWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 0,
    width: "100%",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  // textContainer is now a TouchableOpacity, but its styles remain the same for layout
  textContainer: {
    flex: 1,
    width: 0,
    // CRITICAL: This padding creates the necessary space between the text and the buttons.
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  difficultyContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  scoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  leftButton: {
    marginLeft: 15,
    marginRight: 0,
  },
  rightButton: {
    marginRight: 15,
    marginLeft: 0,
  },
});

export default HabitItem;
