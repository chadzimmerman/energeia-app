import { Text } from "@/components/Themed";
import Colors from "@/constants/Colors";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Habit Status/Color Constants
type HabitStatus = "green" | "orange" | "red" | "grey";

const STATUS_OPTIONS: { label: string; status: HabitStatus; color: string }[] =
  [
    { label: "Successful", status: "green", color: "#2ECC71" },
    { label: "Partial/Difficult", status: "orange", color: "#E67E22" },
    { label: "Missed/Failed", status: "red", color: "#E74C3C" },
    { label: "Untracked (Reset)", status: "grey", color: "#B0BEC5" },
  ];

interface DailyLogModalProps {
  isVisible: boolean;
  onClose: () => void;
  date: Date | null;
  initialStatus: HabitStatus;
  habitTitle: string;
  onSave: (status: HabitStatus, notes: string, date: Date) => void;
  initialNotes?: string;
}

const DailyLogModal: React.FC<DailyLogModalProps> = ({
  isVisible,
  onClose,
  date,
  initialStatus,
  habitTitle,
  onSave,
  initialNotes = "", // 👈 ADD THIS HERE TOO
}) => {
  const [selectedStatus, setSelectedStatus] =
    useState<HabitStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);

  // Sync internal state when props change
  useEffect(() => {
    setSelectedStatus(initialStatus);
    setNotes(initialNotes); // 👈 THIS ensures the note loads when you click the day
  }, [date, isVisible, initialStatus, initialNotes]);

  // Format the date for the modal header
  const formattedDate = date
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "Loading Date...";

  const handleSave = () => {
    if (!date) return;

    onSave(selectedStatus, notes, date);
  };

  if (!date) return null; // Don't render if date is null

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color="#A737FD" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{habitTitle}</Text>
            <Text style={styles.modalSubtitle}>{formattedDate}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Status Selector */}
            <View style={styles.controlSection}>
              <Text style={styles.sectionTitle}>STATUS</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map(({ label, status, color }) => {
                  const isActive = selectedStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        { backgroundColor: isActive ? color : "#fff" },
                        { borderColor: color, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <FontAwesome
                        name={
                          status === "green"
                            ? "check"
                            : status === "orange"
                              ? "exclamation"
                              : status === "red"
                                ? "times"
                                : "question"
                        }
                        size={20}
                        color={isActive ? "#fff" : color}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isActive ? "#fff" : color },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes/Reflection Input */}
            <View style={styles.controlSection}>
              <Text style={styles.sectionTitle}>
                DAILY REFLECTION (OPTIONAL)
              </Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={{
                    width: "100%",
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  placeholder="How did this habit go today?"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>SAVE LOG</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- STYLES FOR MODAL ---
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end", // Modal slides up from the bottom
    backgroundColor: "rgba(0,0,0,0.5)", // Dark overlay
  },
  modalView: {
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "80%", // Limit height
    width: "100%",
  },
  header: {
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "transparent",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.light.tint,
    marginTop: 5,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    left: 0,
    padding: 5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 10,
  },

  // --- Controls Section (Adapted from original modal styles) ---
  controlSection: {
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#A9A9A9",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 5,
  },
  statusButton: {
    width: "48%", // Allow for two buttons per row
    alignItems: "center",
    paddingVertical: 15,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontWeight: "600",
    fontSize: 16,
  },

  // --- Reflection Input ---
  textInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#A9A9A9",
    fontStyle: "italic",
    textAlign: "center",
  },

  // --- Save Button ---
  saveButton: {
    backgroundColor: Colors.light.tint, // Purple tint
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  actualInput: {
    width: "100%",
    minHeight: 100,
    color: "#333",
    fontSize: 16,
    textAlignVertical: "top", // Ensures text starts at the top on Android
    padding: 10,
  },
});

export default DailyLogModal;
