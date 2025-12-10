import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { supabase } from "@/utils/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Slider from "@react-native-community/slider";
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
  // The habit object to edit. Null if no habit is selected.
  habitToEdit: Habit | null;
  // Function to call after successful save or delete, to trigger a refresh of the list
  onHabitChange: () => void;
}

// --- Effort Scale Constants (Reused for Difficulty) ---
const DIFFICULTY_LABELS = {
  1: "Easy (1)",
  5: "Medium (5)",
  10: "Hard (10)",
};

export default function HabitEditModal({
  isVisible,
  onClose,
  habitToEdit,
  onHabitChange,
}: HabitEditModalProps) {
  // State for the editable habit properties
  const [title, setTitle] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [isNegative, setIsNegative] = useState(false);
  const [difficulty, setDifficulty] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  // Effect to populate state when a new habit is passed in
  useEffect(() => {
    if (isVisible && habitToEdit) {
      setTitle(habitToEdit.title);
      setIsPositive(habitToEdit.is_positive);
      setIsNegative(habitToEdit.is_negative);
      setDifficulty(habitToEdit.difficulty);
    } else if (isVisible && !habitToEdit) {
      // Should ideally not happen if only opened from HabitItem click
      setTitle("");
      setIsPositive(true);
      setIsNegative(false);
      setDifficulty(5);
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

      // Success: Trigger refresh and close
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
        {
          text: "Cancel",
          style: "cancel",
        },
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

              // Success: Trigger refresh and close
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
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Edit Habit</Text>

          {/* 1. Title Input */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>TITLE</Text>
            <TextInput
              placeholder="Habit Name"
              placeholderTextColor="#999"
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* 2. Type Selector (Positive/Negative) */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>TYPE</Text>
            <View style={styles.controlRow}>
              {/* POSITIVE BUTTON */}
              <TouchableOpacity
                style={[styles.typeButton, isPositive && styles.activeControl]}
                onPress={() => setIsPositive((prev) => !prev)}
              >
                <FontAwesome
                  name="plus"
                  size={20}
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
                style={[styles.typeButton, isNegative && styles.activeControl]}
                onPress={() => setIsNegative((prev) => !prev)}
              >
                <FontAwesome
                  name="minus"
                  size={20}
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

          {/* 3. Difficulty Slider (1-10) */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>DIFFICULTY (1-10)</Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={difficulty}
              onValueChange={setDifficulty}
              minimumTrackTintColor={Colors.light.tint}
              maximumTrackTintColor="#DCDCDC"
              thumbTintColor={Colors.light.tint}
            />

            <View style={styles.sliderLabelRow}>
              <Text style={styles.sliderLabel}>{DIFFICULTY_LABELS[1]}</Text>
              <Text style={styles.sliderLabelCenter}>
                {DIFFICULTY_LABELS[5]}
              </Text>
              <Text style={styles.sliderLabelRight}>
                {DIFFICULTY_LABELS[10]}
              </Text>
            </View>

            <Text style={styles.currentEffortText}>
              Current Difficulty: {difficulty}
            </Text>
          </View>

          {/* 4. Action Buttons (Delete, Cancel, Save) */}
          <View style={styles.actionRow}>
            {/* DELETE BUTTON - NEW FEATURE */}
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
              disabled={isSaving}
            >
              <FontAwesome name="trash" size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>

            <View style={styles.rightActionGroup}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelButton}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                    Saving...
                  </Text>
                ) : (
                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

// app/HabitEditModal.tsx - Styles
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  habitTitleLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 20,
  },

  // --- Controls Section ---
  controlSection: {
    width: "100%",
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#A9A9A9",
    marginBottom: 8,
  },

  // Title Input
  textInput: {
    backgroundColor: "#F7F7F7",
    color: "#333",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  // Type Row (Positive/Negative)
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 1,
  },
  activeControl: {
    backgroundColor: Colors.light.tint,
  },
  controlText: {
    marginTop: 5,
    fontWeight: "600",
    color: Colors.light.tint,
    fontSize: 14,
  },
  activeControlText: {
    color: "#fff",
  },

  // Slider
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: -10,
    paddingHorizontal: 0,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#999",
    width: "30%",
    textAlign: "left",
  },
  sliderLabelCenter: {
    fontSize: 12,
    color: "#999",
    width: "40%",
    textAlign: "center",
  },
  sliderLabelRight: {
    fontSize: 12,
    color: "#999",
    width: "30%",
    textAlign: "right",
  },
  currentEffortText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C", // Red for destructive action
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 5,
  },
  rightActionGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    marginRight: 10,
    alignItems: "center",
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    minWidth: 100, // Ensure save button is wide enough for "Saving..."
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  saveButtonText: {
    color: "#fff",
  },
});
