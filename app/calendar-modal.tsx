import { Text } from "@/components/Themed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type HabitStatus = "green" | "orange" | "red" | "grey";

const STATUS_OPTIONS: { label: string; status: HabitStatus; color: string }[] =
  [
    { label: "Bright", status: "green", color: "#2ECC71" },
    { label: "Dimming", status: "orange", color: "#E67E22" },
    { label: "Darkened", status: "red", color: "#E74C3C" },
    { label: "Untracked", status: "grey", color: "#B0BEC5" },
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
  initialNotes = "",
}) => {
  const [selectedStatus, setSelectedStatus] =
    useState<HabitStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setSelectedStatus(initialStatus);
    setNotes(initialNotes);
  }, [date, isVisible, initialStatus, initialNotes]);

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

  if (!date) return null;

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
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {habitTitle}
            </Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.headerAction, styles.headerActionBold]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {/* 2. Status Selector */}
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

          {/* 3. Notes/Reflection Input */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>DAILY REFLECTION (OPTIONAL)</Text>
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="How did this habit go today?"
                placeholderTextColor="#D0C2F2"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

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
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#E0C8FF",
    fontSize: 13,
    marginTop: 2,
  },
  headerAction: {
    color: "#fff",
    fontSize: 16,
    minWidth: 55,
  },
  headerActionBold: {
    fontWeight: "bold",
    textAlign: "right",
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

  // Status Row (2x2 grid)
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 5,
  },
  statusButton: {
    width: "48%",
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

  // Notes Input
  notesContainer: {
    backgroundColor: "#7A22BD",
    borderRadius: 8,
    padding: 15,
    minHeight: 120,
  },
  notesInput: {
    color: "#fff",
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 90,
    width: "100%",
  },
});

export default DailyLogModal;
