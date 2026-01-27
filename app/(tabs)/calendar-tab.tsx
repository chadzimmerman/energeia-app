import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Import for Icons

import CharacterStats from "@/components/CharacterStats";
import { View as ThemedView } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { supabase } from "@/utils/supabase";
import DailyLogModal from "../calendar-modal";

// Get screen width for responsive sizing
const screenWidth = Dimensions.get("window").width;
// Calculate the size of a single day cell for a 7-column grid with padding
const totalHorizontalPadding = 40; // 20px on each side of the main calendar container
const gap = 5; // Gap between days
const dayCellSize = Math.floor(
  (screenWidth - totalHorizontalPadding - 6 * gap) / 7,
);

// --- MOCK DATA & TYPES ---

// Type for the status of a habit on a given day
type HabitStatus = "green" | "orange" | "red" | "grey";

interface HabitDay {
  date: Date;
  status: HabitStatus;
  notes?: string;
}

const MOCK_HABIT_TITLE = "Daily 30-Minute Run";

// Habit Status Colors
const STATUS_COLORS = {
  green: "#2ECC71", // Positive/Success
  orange: "#E67E22", // Difficult/Partial
  red: "#E74C3C", // Failure/Missed
  grey: "#ECF0F1", // Untracked/Blank
};

// --- UTILITY FUNCTIONS ---

const getMonthName = (date: Date) =>
  date.toLocaleString("default", { month: "long" });

/**
 * Calculates the day structure for the given month/year.
 */
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

  const days: (number | null)[] = [];

  // 1. Add leading empty spaces
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }

  // 2. Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // 3. Add trailing empty spaces
  const totalCells = days.length;
  const trailingPadding = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailingPadding; i++) {
    days.push(null);
  }

  return days;
};

// --- COMPONENTS ---

// Interface for DayCell props
interface DayCellProps {
  day: number | null;
  year: number;
  month: number;
  status: HabitStatus;
  onDayPress: (dayData: HabitDay) => void;
}

/**
 * Renders a single calendar day cell.
 */
const DayCell: React.FC<DayCellProps> = ({
  day,
  year,
  month,
  status,
  onDayPress,
}) => {
  if (day === null) {
    return <View style={calendarStyles.dayCellBlank} />;
  }

  // Format key to match mock data (e.g., '2026-3-15')
  const dateKey = `${year}-${month + 1}-${day}`;
  const color = STATUS_COLORS[status];

  // Convert day/month/year to a full Date object
  const fullDate = new Date(year, month, day);

  const handleDayClick = () => {
    // 1. Create the data object to pass to the modal
    const dayData: HabitDay = {
      date: fullDate,
      status: status,
    };
    // 2. Call the handler function passed from the main screen
    onDayPress(dayData);
  };

  const isToday = fullDate.toDateString() === new Date().toDateString();
  const textColor =
    status === "grey"
      ? calendarStyles.dayText_grey.color
      : calendarStyles.dayText.color;

  return (
    <TouchableOpacity
      style={[
        calendarStyles.dayCell,
        { backgroundColor: color },
        isToday && { borderColor: Colors.light.tint, borderWidth: 2 }, // Highlight today
      ]}
      onPress={handleDayClick}
      activeOpacity={0.7}
      // Allows clicking any tracked day or today
      disabled={false}
    >
      <Text style={{ ...calendarStyles.dayText, color: textColor }}>{day}</Text>
    </TouchableOpacity>
  );
};

// Interface for CalendarView props
interface CalendarViewProps {
  onDayPress: (dayData: HabitDay) => void;
  habitLogs: { [key: string]: { status: HabitStatus; notes: string } };
}

/**
 * Main calendar view with month navigation.
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  onDayPress,
  habitLogs,
}) => {
  // Start date (March 2026 as seen in the screenshot)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  // Memoize the day calculation to avoid unnecessary re-renders
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const monthYearString = `${getMonthName(currentDate)} ${year}`;

  const dayLabels = ["M", "T", "W", "Th", "F", "S", "Su"];

  return (
    <View style={calendarStyles.calendarContainer}>
      {/* Month/Year Header with Navigation */}
      <View style={calendarStyles.monthHeader}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={calendarStyles.navButton}
        >
          <Text style={calendarStyles.navText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>{monthYearString}</Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={calendarStyles.navButton}
        >
          <Text style={calendarStyles.navText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Day Labels (M, T, W, Th, F, S, Su) */}
      <View style={calendarStyles.dayLabelsRow}>
        {dayLabels.map((label) => (
          <Text key={label} style={calendarStyles.dayLabelText}>
            {label}
          </Text>
        ))}
      </View>

      {/* Day Grid */}
      <View style={calendarStyles.dayGrid}>
        {days.map((day, index) => {
          const dateKey = day
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          const savedData = habitLogs[dateKey];

          return (
            <DayCell
              key={index}
              day={day}
              year={year}
              month={month}
              // Access .status from the object, or default to "grey"
              status={savedData ? savedData.status : "grey"}
              onDayPress={onDayPress}
            />
          );
        })}
      </View>
    </View>
  );
};

/**
 * Habit Tracking Selector
 * 🔥 Updated to accept a 'title' prop
 */
const HabitTrackerSection: React.FC<{ title: string; onPress: () => void }> = ({
  title,
  onPress,
}) => {
  return (
    <TouchableOpacity style={calendarStyles.habitTrackerBox} onPress={onPress}>
      <Text style={calendarStyles.habitTrackerLabel}>Tracking Habit:</Text>
      <Text style={calendarStyles.habitTrackerName}>{title}</Text>
      <Text style={{ color: Colors.light.tint, marginTop: 5, fontSize: 12 }}>
        Tap to change
      </Text>
    </TouchableOpacity>
  );
};

// ----------------------------------------------------------------------
// DAILY LOG MODAL COMPONENT (Embedded for single-file fix)
// ----------------------------------------------------------------------

// Habit Status/Color Constants for Modal
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
  onSave: (status: HabitStatus, notes: string, logDate: Date) => void;
}

// --- MAIN TAB SCREEN ---

export default function CalendarTabScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<HabitDay | null>(null);
  const [myHabits, setMyHabits] = useState<any[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const [habitLogs, setHabitLogs] = useState<{
    [key: string]: { status: HabitStatus; notes: string };
  }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  //loads any changes from modal on change
  useEffect(() => {
    if (selectedHabit) {
      fetchLogs();
    }
  }, [selectedHabit]);

  //fetch the user on load
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  //handles save logs
  const handleSaveLog = async (
    status: HabitStatus,
    notes: string,
    logDate: Date,
  ) => {
    if (!selectedHabit || !userId) return;

    // This creates "2026-03-13" regardless of what time it is in Moscow
    const year = logDate.getFullYear();
    const month = String(logDate.getMonth() + 1).padStart(2, "0");
    const day = String(logDate.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    const { error } = await supabase.from("habit_logs").upsert(
      {
        habit_id: selectedHabit.id,
        user_id: userId,
        log_date: dateString,
        status: status,
        notes: notes,
      },
      { onConflict: "habit_id, log_date" },
    );

    if (!error) {
      await fetchLogs();
      setIsModalVisible(false);
    }
  };

  //fetch logs
  const fetchLogs = async () => {
    if (!selectedHabit) return;
    const { data } = await supabase
      .from("habit_logs")
      .select("log_date, status, notes") // 👈 Add notes here
      .eq("habit_id", selectedHabit.id);

    const logMap = data?.reduce((acc: any, curr: any) => {
      // Store the whole object so we have status AND notes
      acc[curr.log_date] = { status: curr.status, notes: curr.notes };
      return acc;
    }, {});
    setHabitLogs(logMap || {});
  };

  //Fetch your habits on mount
  useEffect(() => {
    const loadHabits = async () => {
      const { data } = await supabase.from("user_habits").select("*");
      if (data && data.length > 0) {
        setMyHabits(data);
        setSelectedHabit(data[0]); // Default to the first habit (e.g., "Kiss Wife")
      }
    };
    loadHabits();
  }, []);

  /**
   * Handler function called when a calendar day is pressed.
   */
  const handleDayPress = (dayData: HabitDay) => {
    // 1. Create the same YYYY-MM-DD key we use in the database
    const year = dayData.date.getFullYear();
    const month = String(dayData.date.getMonth() + 1).padStart(2, "0");
    const day = String(dayData.date.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    // 2. Look up the saved data for this specific day
    const savedData = habitLogs[dateKey];

    // 3. Pass both the status AND the notes into the state
    setSelectedDayData({
      date: dayData.date,
      status: savedData?.status || "grey",
      notes: savedData?.notes || "", // 👈 This is the "Magic Link"
    });

    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    // Here you would typically also trigger a data refresh for the calendar view
    setIsModalVisible(false);
    setSelectedDayData(null);
  };

  // Destructure selected day data safely for props
  const date = selectedDayData?.date || null;
  const initialStatus = selectedDayData?.status || "grey";

  return (
    <ThemedView style={styles.container}>
      {/* 1. Character Stats Header */}
      <CharacterStats
        backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
        characterImageSource={require("../../assets/sprites/characters/monk/novice-monk-male.png")}
        currentHealth={75}
        maxHealth={100}
        currentEnergy={50}
        maxEnergy={100}
      />

      {/* 2. Scrollable Content (Calendar and Habit Tracker) */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CalendarView onDayPress={handleDayPress} habitLogs={habitLogs} />
        <HabitTrackerSection
          // This ensures the title at the bottom matches the habit you're actually viewing
          title={selectedHabit?.title || "Daily 30-Minute Run"}
          onPress={() => setIsPickerVisible(true)}
        />
      </ScrollView>

      {/* 3. RENDER THE MODAL COMPONENT */}
      <DailyLogModal
        isVisible={isModalVisible}
        onClose={handleModalClose}
        date={date}
        initialStatus={initialStatus}
        // 🔥 FIX: Pass the notes from your state to the modal
        initialNotes={selectedDayData?.notes || ""}
        habitTitle={selectedHabit?.title || MOCK_HABIT_TITLE}
        onSave={handleSaveLog}
      />
      {/* Habit Selection Modal */}
      <Modal visible={isPickerVisible} animationType="slide" transparent={true}>
        <View style={modalStyles.centeredView}>
          <View style={[modalStyles.modalView, { maxHeight: "50%" }]}>
            <Text style={[modalStyles.modalTitle, { marginBottom: 20 }]}>
              Select Habit
            </Text>
            <ScrollView>
              {myHabits.map((habit) => (
                <TouchableOpacity
                  key={habit.id}
                  style={{
                    paddingVertical: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: "#EEE",
                  }}
                  onPress={() => {
                    setSelectedHabit(habit);
                    setIsPickerVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#333" }}>
                    {habit.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setIsPickerVisible(false)}
              style={{ marginTop: 20, alignItems: "center" }}
            >
              <Text style={{ color: "red", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// --- CALENDAR STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Fix: Assuming the navigation header is handled by the router/stack.
    // If the entire view is showing the modal header, ensure no absolute positioning here
    // that covers the navigation bar. But based on the previous context,
    // we're assuming the router handles the "Calendar" title.
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 20,
    alignItems: "center",
    width: "100%",
  },
});

const calendarStyles = StyleSheet.create({
  calendarContainer: {
    width: "100%",
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  // --- Header ---
  monthHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 10,
  },
  navButton: {
    padding: 10,
  },
  navText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  // --- Day Labels ---
  dayLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    marginBottom: 5,
  },
  dayLabelText: {
    width: dayCellSize,
    textAlign: "center",
    fontWeight: "bold",
    color: "#666",
  },
  // --- Day Grid ---
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: gap,
    rowGap: gap,
  },
  dayCell: {
    width: dayCellSize,
    height: dayCellSize,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  dayCellBlank: {
    width: dayCellSize,
    height: dayCellSize,
    backgroundColor: "transparent",
  },
  dayText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  // Override for grey/untracked days to have dark text
  dayText_grey: {
    color: "#333",
  },
  // --- Habit Tracker ---
  habitTrackerBox: {
    marginTop: 30,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  habitTrackerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  habitTrackerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
});

// --- MODAL STYLES (renamed to modalStyles to avoid conflicts) ---
const modalStyles = StyleSheet.create({
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

  // --- Controls Section ---
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
});
