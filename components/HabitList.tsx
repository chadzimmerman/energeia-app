import React from "react";
import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import HabitItem from "./HabitItem";

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  streak_level: number;
  difficulty: number;
}

interface HabitListProps {
  habits: Habit[];
  onScore: (habitId: string, direction: "up" | "down") => void;
  onEdit: (habit: Habit) => void;
  onReorder: (habits: Habit[]) => void;
}

const HabitList: React.FC<HabitListProps> = ({ habits, onScore, onEdit, onReorder }) => {
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Habit>) => (
    <ScaleDecorator>
      <HabitItem
        habit={item}
        onScore={onScore}
        onEdit={onEdit}
        drag={drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  );

  return (
    <DraggableFlatList
      data={habits}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={({ data }) => onReorder(data)}
      contentContainerStyle={styles.listContainer}
    />
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
