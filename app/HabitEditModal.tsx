import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { supabase } from "@/utils/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  streak_level: number;
  difficulty: number;
}

interface HabitEditModalProps {
  isVisible: boolean;
  onClose: () => void;
  habitToEdit: Habit | null;
  onHabitChange: () => void;
}

const DIFFICULTIES = [
  { label: "Easy", value: 1, stars: 1 },
  { label: "Medium", value: 5, stars: 2 },
  { label: "Hard", value: 10, stars: 3 },
];

// Snap a 1-10 stored value to the nearest Easy/Medium/Hard tier
function snapDifficulty(value: number): number {
  if (value <= 3) return 1;
  if (value <= 7) return 5;
  return 10;
}

export default function HabitEditModal({
  isVisible,
  onClose,
  habitToEdit,
  onHabitChange,
}: HabitEditModalProps) {
  const [title, setTitle] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [isNegative, setIsNegative] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isVisible && habitToEdit) {
      setTitle(habitToEdit.title);
      setIsPositive(habitToEdit.is_positive);
      setIsNegative(habitToEdit.is_negative);
      setDifficulty(snapDifficulty(habitToEdit.difficulty));
    } else if (isVisible && !habitToEdit) {
      setTitle("");
      setIsPositive(true);
      setIsNegative(false);
      setDifficulty(1);
    }
  }, [isVisible, habitToEdit]);

  if (!isVisible || !habitToEdit) {
    return null;
  }

  const handleSave = async () => {
    if (title.trim().length === 0) {
      Alert.alert("Error", "Habit title cannot be empty.");
      return;
    }
    if (!isPositive && !isNegative) {
      Alert.alert(
        "Error",
        "A habit must be either Positive, Negative, or both."
      );
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_habits")
        .update({
          title: title.trim(),
          is_positive: isPositive,
          is_negative: isNegative,
          difficulty: difficulty,
        })
        .eq("id", habitToEdit.id);

      if (error) throw error;

      onHabitChange();
      onClose();
    } catch (e: any) {
      console.error("Habit Update Error:", e.message);
      Alert.alert(
        "Error Saving Habit",
        "Could not save changes. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete the habit: "${habitToEdit.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error } = await supabase
                .from("user_habits")
                .delete()
                .eq("id", habitToEdit.id);

              if (error) throw error;

              onHabitChange();
              onClose();
            } catch (e: any) {
              console.error("Habit Delete Error:", e.message);
              Alert.alert(
                "Error Deleting Habit",
                "Could not delete habit. Please try again."
              );
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 1. Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Habit</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={[styles.headerAction, styles.headerActionBold]}>
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Title Input */}
        <View style={styles.inputSection}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Habit Title"
            placeholderTextColor="#D0C2F2"
            style={[styles.textInput, styles.titleInput]}
          />
        </View>

        {/* 3. Controls: Positive / Negative */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>CONTROLS</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlButton, isPositive && styles.activeControl]}
              onPress={() => setIsPositive((prev) => !prev)}
            >
              <FontAwesome
                name="plus"
                size={30}
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

            <TouchableOpacity
              style={[styles.controlButton, isNegative && styles.activeControl]}
              onPress={() => setIsNegative((prev) => !prev)}
            >
              <FontAwesome
                name="minus"
                size={30}
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

        {/* 4. Difficulty Selector */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>DIFFICULTY</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((d) => {
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
                          name="star"
                          size={18}
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

        {/* 5. Danger Zone */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <FontAwesome name="trash" size={16} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete This Habit</Text>
          </TouchableOpacity>
        </View>

        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },

  // --- Header ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#A737FD",
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: Platform.OS === "ios" ? 55 : 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerAction: {
    color: "#fff",
    fontSize: 16,
    minWidth: 60,
  },
  headerActionBold: {
    fontWeight: "bold",
    textAlign: "right",
  },

  // --- Input Section ---
  inputSection: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#A737FD",
  },
  textInput: {
    backgroundColor: "#7A22BD",
    color: "#fff",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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
    backgroundColor: Colors.light.tint,
  },
  controlText: {
    marginTop: 5,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  activeControlText: {
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

  // Danger Zone
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
