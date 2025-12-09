import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import HabitItem from "./HabitItem"; // Import the row item

// Define the Habit data structure (re-using the one from HabitItem)
interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  streak_level: number;
  difficulty: number;
  // We MUST remove 'onScore' from this data interface, as the HabitItem
  // component expects it to be passed as a separate prop, not embedded
  // in the 'habit' data object. (This was the issue in HabitItem.tsx)
}

// Define the props for the HabitList component
interface HabitListProps {
  habits: Habit[];
  onScore: (habitId: string, direction: "up" | "down") => void;
}

const HabitList: React.FC<HabitListProps> = ({ habits, onScore }) => {
  // 💡 FIX: Added a check for '!habits' to handle the case where the prop is undefined.
  if (!habits || habits.length === 0) {
    return (
      <View style={styles.noHabitsContainer}>
        <Text style={styles.noHabitsText}>
          You haven't added any habits yet! 🧘‍♂️
        </Text>
        <Text style={styles.noHabitsSubtext}>
          Tap the '+' icon above to define your first task.
        </Text>
      </View>
    );
  }

  // Use ScrollView to make the list scrollable if content exceeds the screen height
  return (
    <ScrollView contentContainerStyle={styles.listContainer}>
      {habits.map((habit) => (
        <HabitItem key={habit.id} habit={habit} onScore={onScore} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  noHabitsContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  noHabitsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  noHabitsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default HabitList;
