import React, { useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  streak_level: number;
  difficulty: number;
  reset_frequency: string;
}

interface HabitItemProps {
  habit: Habit;
  onScore: (habitId: string, direction: "up" | "down") => void;
  onEdit: (habit: Habit) => void;
  drag: () => void;
  isActive: boolean;
}

const getStreakColor = (streakLevel: number): string => {
  if (streakLevel >= 7) return "#4A90D9";
  if (streakLevel >= 1) return "#4CAF50";
  if (streakLevel === 0) return "#F4D35E";
  return "#E85A4F";
};

const HabitItem: React.FC<HabitItemProps> = ({ habit, onScore, onEdit, drag, isActive }) => {
  const buttonColor = getStreakColor(habit.streak_level);

  // Plus floater
  const plusFloatY = useRef(new Animated.Value(0)).current;
  const plusFloatX = useRef(new Animated.Value(0)).current;
  const plusOpacity = useRef(new Animated.Value(0)).current;
  const [showPlus, setShowPlus] = useState(false);

  // Minus floater
  const minusFloatY = useRef(new Animated.Value(0)).current;
  const minusFloatX = useRef(new Animated.Value(0)).current;
  const minusOpacity = useRef(new Animated.Value(0)).current;
  const [showMinus, setShowMinus] = useState(false);

  const triggerFloat = (
    floatY: Animated.Value,
    floatX: Animated.Value,
    opacity: Animated.Value,
    setShow: (v: boolean) => void,
  ) => {
    const xDrift = (Math.random() - 0.5) * 18; // ±9px horizontal wander
    const yEnd  = -44 - Math.random() * 20;    // -44 to -64px vertical rise

    floatY.setValue(0);
    floatX.setValue(0);
    opacity.setValue(1);
    setShow(true);
    Animated.parallel([
      Animated.timing(floatY,   { toValue: yEnd,   duration: 900, useNativeDriver: true }),
      Animated.timing(floatX,   { toValue: xDrift, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => setShow(false));
  };

  return (
    <View style={[styles.cardWrapper, isActive && styles.cardActive]}>
      {/* Drag handle */}
      <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
        <FontAwesome name="bars" size={14} color="#CCCCCC" />
      </TouchableOpacity>

      {/* Minus button + floater */}
      {habit.is_negative && (
        <>
          {showMinus && (
            <Animated.View
              style={[
                styles.floater,
                styles.floaterLeft,
                { transform: [{ translateY: minusFloatY }, { translateX: minusFloatX }], opacity: minusOpacity },
              ]}
            >
              <FontAwesome name="flash" size={16} color="#E85A4F" />
            </Animated.View>
          )}
          <TouchableOpacity
            style={[styles.scoreButton, styles.leftButton, { backgroundColor: buttonColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              triggerFloat(minusFloatY, minusFloatX, minusOpacity, setShowMinus);
              onScore(habit.id, "down");
            }}
          >
            <FontAwesome name="minus" size={20} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Title */}
      <TouchableOpacity style={styles.textContainer} onPress={() => onEdit(habit)} activeOpacity={0.7}>
        <Text style={styles.title} numberOfLines={1}>{habit.title}</Text>
        {habit.streak_level > 0 && (
          <Text style={styles.streakText}>
            {habit.streak_level} {habit.reset_frequency === "Weekly" ? "week" : habit.reset_frequency === "Monthly" ? "month" : "day"} streak
          </Text>
        )}
      </TouchableOpacity>

      {/* Plus button + floater */}
      {habit.is_positive && (
        <>
          {showPlus && (
            <Animated.View
              style={[
                styles.floater,
                styles.floaterRight,
                { transform: [{ translateY: plusFloatY }, { translateX: plusFloatX }], opacity: plusOpacity },
              ]}
            >
              <FontAwesome name="flash" size={16} color="#FFD700" />
            </Animated.View>
          )}
          <TouchableOpacity
            style={[styles.scoreButton, styles.rightButton, { backgroundColor: buttonColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              triggerFloat(plusFloatY, plusFloatX, plusOpacity, setShowPlus);
              onScore(habit.id, "up");
            }}
          >
            <FontAwesome name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    overflow: "visible",
  },
  textContainer: {
    flex: 1,
    width: 0,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  streakText: {
    fontSize: 11,
    color: "#AAAAAA",
    marginTop: 3,
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
  dragHandle: {
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardActive: {
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  leftButton: {
    marginLeft: 8,
    marginRight: 0,
  },
  rightButton: {
    marginRight: 15,
    marginLeft: 0,
  },
  floater: {
    position: "absolute",
    top: 8,
    zIndex: 100,
    pointerEvents: "none",
  },
  floaterLeft: {
    left: 16,
  },
  floaterRight: {
    right: 23,
  },
});

export default HabitItem;
