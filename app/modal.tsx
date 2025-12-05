import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors"; // Assuming you have a Colors file

// --- Constants for Difficulty and Reset Counter ---
const DIFFICULTIES = [
  { label: "Easy", value: 1, icon: "star-o", stars: 1 },
  { label: "Medium", value: 2, icon: "star", stars: 2 },
  { label: "Hard", value: 3, icon: "star", stars: 3 },
];

const RESET_OPTIONS = ["Daily", "Weekly", "Monthly"];

export default function ModalScreen() {
  const [isPositive, setIsPositive] = React.useState(true); // Start with positive selected
  const [isNegative, setIsNegative] = React.useState(false);
  const [reset, setReset] = React.useState("Weekly");
  const [difficulty, setDifficulty] = React.useState(1);
  return (
    <View style={styles.container}>
      {/* 1. Header Navigation Options */}
      <Stack.Screen
        options={{
          title: "New Habit",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: Colors.light.tint, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                /* Add habit creation logic here */ router.back();
              }}
            >
              <Text
                style={{
                  color: Colors.light.tint,
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                Create
              </Text>
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: "#A737FD", // Habitica purple background
          },
          headerTintColor: "#fff", // White text
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />

      {/* 2. Title and Notes Inputs */}
      <View style={styles.inputSection}>
        <TextInput
          placeholder="Title"
          placeholderTextColor="#D0C2F2"
          style={[styles.textInput, styles.titleInput]}
        />
        <TextInput
          placeholder="Notes"
          placeholderTextColor="#D0C2F2"
          style={styles.textInput}
          multiline={true}
        />
      </View>

      {/* 3. Controls: Positive / Negative */}
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>CONTROLS</Text>
        <View style={styles.controlRow}>
          {/* POSITIVE BUTTON */}
          <TouchableOpacity
            style={[styles.controlButton, isPositive && styles.activeControl]}
            // ✅ Toggle only the isPositive state
            onPress={() => setIsPositive((prev) => !prev)}
          >
            <FontAwesome
              name="plus"
              size={30}
              // Style based on isPositive
              color={isPositive ? "#fff" : Colors.light.tint}
            />
            <Text
              style={[
                styles.controlText,
                isPositive && styles.activeControlText,
              ]}
            >
              Positive
            </Text>
          </TouchableOpacity>

          {/* NEGATIVE BUTTON */}
          <TouchableOpacity
            style={[styles.controlButton, isNegative && styles.activeControl]}
            // ✅ Toggle only the isNegative state
            onPress={() => setIsNegative((prev) => !prev)}
          >
            <FontAwesome
              name="minus"
              size={30}
              // Style based on isNegative
              color={isNegative ? "#fff" : Colors.light.tint}
            />
            <Text
              style={[
                styles.controlText,
                isNegative && styles.activeControlText,
              ]}
            >
              Negative
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Reset Counter */}
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>RESET COUNTER</Text>
        <View style={styles.resetRow}>
          {RESET_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.resetButton,
                reset === option && styles.activeReset,
              ]}
              onPress={() => setReset(option)}
            >
              <Text
                style={[
                  styles.resetText,
                  reset === option && styles.activeResetText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. Difficulty Selector */}
      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>DIFFICULTY</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => {
            // Check if the current difficulty button is the one selected
            const isActive = difficulty === d.value;

            return (
              <TouchableOpacity
                key={d.value}
                style={styles.difficultyButton}
                onPress={() => setDifficulty(d.value)}
              >
                <Text style={styles.difficultyLabel}>{d.label}</Text>
                <View style={styles.starContainer}>
                  {Array(d.stars)
                    .fill(0)
                    .map((_, i) => (
                      <FontAwesome
                        key={i}
                        name="star" // All stars are filled stars in this view
                        size={18}
                        // 🎯 CHANGE 2: Highlight stars based ONLY on whether this button is active
                        color={isActive ? Colors.light.tint : "#DCDCDC"}
                        style={{ marginHorizontal: 1 }}
                      />
                    ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

// app/modal.tsx - Place these styles at the bottom
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0", // Light gray background
  },

  // --- Input Section ---
  inputSection: {
    paddingHorizontal: 15,
    paddingTop: 20,
    backgroundColor: "#A737FD", // Match header purple
  },
  textInput: {
    backgroundColor: "#7A22BD", // Darker purple input background
    color: "#fff",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  titleInput: {
    height: 50,
  },

  // --- Controls Section ---
  controlSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#A9A9A9",
    marginBottom: 8,
  },

  // Controls Row (Positive/Negative)
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },
  controlButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  activeControl: {
    backgroundColor: Colors.light.tint, // Active color (Purple tint)
  },
  controlText: {
    marginTop: 5,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  activeControlText: {
    color: "#fff",
  },

  // Reset Counter Row
  resetRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },
  resetButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeReset: {
    backgroundColor: Colors.light.tint,
  },
  resetText: {
    fontWeight: "600",
    color: Colors.light.tint,
  },
  activeResetText: {
    color: "#fff",
  },

  // Difficulty Row
  difficultyRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    paddingVertical: 10,
  },
  difficultyButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  starContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
});
