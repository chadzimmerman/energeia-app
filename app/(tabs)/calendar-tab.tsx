import React, { useCallback, useEffect, useMemo, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSeason } from "@/contexts/SeasonContext";
import {
  Dimensions,
  Modal,
  Platform,
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
import { resolveCharacterImage } from "@/utils/resolveCharacterImage";
import { recomputeStreak } from "@/utils/recomputeStreak";
import { useProfile } from "@/contexts/ProfileContext";
import { hasTutorialBeenSeen } from "@/components/TutorialOverlay";
import { useFocusEffect } from "expo-router";
import DailyLogModal from "../calendar-modal";

const buildTutorialMockLogs = (): { [key: string]: { status: HabitStatus; notes: string } } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const today = now.getDate();
  const entries: [number, HabitStatus][] = [
    [1, "green"], [2, "green"], [3, "orange"], [4, "green"], [5, "red"],
    [6, "green"], [7, "green"], [8, "green"], [9, "red"], [10, "green"],
    [11, "orange"], [12, "green"], [13, "green"], [14, "green"], [15, "red"],
    [16, "green"], [17, "green"], [18, "orange"], [19, "green"], [20, "green"],
  ];
  return Object.fromEntries(
    entries
      .filter(([day]) => day <= today)
      .map(([day, status]) => [`${year}-${month}-${String(day).padStart(2, "0")}`, { status, notes: "" }])
  );
};

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
  date?: Date; // Keep this optional just in case
  dateString: string; // Add this as the primary identifier
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

  const color = STATUS_COLORS[status];

  // Convert day/month/year to a full Date object
  const fullDate = new Date(year, month, day);

  const handleDayClick = () => {
    // Create the string immediately where the numbers are pure
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayData: any = {
      dateString: dateKey, // Use a string, not a Date object
      status: status,
    };
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
  const [currentDate, setCurrentDate] = useState(new Date());

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
          <FontAwesome name="caret-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>{monthYearString}</Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={calendarStyles.navButton}
        >
          <FontAwesome name="caret-right" size={24} color="#333" />
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



// --- MAIN TAB SCREEN ---

export default function CalendarTabScreen() {
  const { seasonColor, seasonBackground } = useSeason();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<HabitDay | null>(null);
  const [myHabits, setMyHabits] = useState<any[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const [habitLogs, setHabitLogs] = useState<{
    [key: string]: { status: HabitStatus; notes: string };
  }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [showTutorialMocks, setShowTutorialMocks] = useState(false);
  const { profile, equippedCharacterSet, equippedOverlays, animalCompanion, petName, petTappedToday, handlePetTap, wallItems, floorItems, handItems, characterBgColors, refreshProfile } = useProfile();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshData = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const id = session?.user?.id;

        if (id && isActive) {
          setUserId(id);
          refreshProfile();
          hasTutorialBeenSeen(id).then((seen) => { if (isActive) setShowTutorialMocks(!seen); });

          // Always refresh habit list to pick up reordering changes
          const { data: habits } = await supabase
            .from("user_habits")
            .select("*")
            .order("order_index", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false });
          if (habits && habits.length > 0 && isActive) {
            setMyHabits(habits);
            // Only default to first habit on initial load — preserve selection after that
            setSelectedHabit((prev: any) => prev ?? habits[0]);
          }
        }
      };

      refreshData();
      return () => {
        isActive = false;
      };
    }, [refreshProfile]),
  );

  // Keyed on the id, not the habit object: refreshData() refetches the habit
  // list on every focus and hands back a new object each time. Depending on the
  // object would re-run the query on every focus even when the selection has
  // not actually changed.
  const selectedHabitId = selectedHabit?.id ?? null;

  const fetchLogs = useCallback(async () => {
    if (!selectedHabitId) return;
    const { data } = await supabase
      .from("habit_logs")
      .select("log_date, status, notes")
      .eq("habit_id", selectedHabitId);

    const logMap = data?.reduce((acc: any, curr: any) => {
      // Store the whole object so we have status AND notes
      acc[curr.log_date] = { status: curr.status, notes: curr.notes };
      return acc;
    }, {});
    setHabitLogs(logMap || {});
  }, [selectedHabitId]);

  // Runs every time you "Tap to change" a habit. fetchLogs has to be declared
  // above this: a dependency array is evaluated during render, so naming a
  // const defined further down would hit the temporal dead zone.
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  //handles save logs
  const handleSaveLog = async (status: HabitStatus, notes: string) => {
    if (!selectedHabit || !userId || !selectedDayData) return;

    const dateString = selectedDayData.dateString; // Pure string from our state

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    setHabitLogs((prev) => ({
      ...prev,
      [dateString]: { status, notes },
    }));

    // 2. Background Sync
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

    if (error) {
      // If it fails, refresh from DB to revert the UI
      await fetchLogs();
    } else {
      setIsModalVisible(false);
      // Keep streak_level in sync with what the calendar shows
      recomputeStreak(selectedHabit.id, userId, selectedHabit.reset_frequency);
    }
  };

  /**
   * Handler function called when a calendar day is pressed.
   */
  const handleDayPress = (dayData: any) => {
    const dateKey = dayData.dateString; // No more getFullYear() calls here!
    const savedData = habitLogs[dateKey];
    const modalDate = new Date(`${dateKey}T00:00:00`);

    setSelectedDayData({
      dateString: dateKey,
      date: modalDate, // Fallback so 'date' isn't missing
      status: savedData?.status || "grey",
      notes: savedData?.notes || "",
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
        backgroundImageSource={seasonBackground}
        characterImageSource={resolveCharacterImage(profile?.character_image_path)}
        equippedCharacterSet={equippedCharacterSet}
        currentHealth={profile?.current_health ?? 0}
        maxHealth={profile?.max_health ?? 100}
        currentEnergy={profile?.current_energeia ?? 0}
        maxEnergy={100 + ((profile?.level ?? 1) - 1) * 20}
        level={profile?.level ?? 1}
        equippedOverlays={equippedOverlays}
        animalCompanion={animalCompanion}
        petName={petName}
        petTappedToday={petTappedToday}
        onPetTap={handlePetTap}
        wallItems={wallItems}
        floorItems={floorItems}
        handItems={handItems}
        characterBgColors={characterBgColors}
      />

      {/* 2. Scrollable Content (Calendar and Habit Tracker) */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CalendarView onDayPress={handleDayPress} habitLogs={showTutorialMocks && Object.keys(habitLogs).length === 0 ? buildTutorialMockLogs() : habitLogs} />
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
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={pickerStyles.container}>
          {/* Header */}
          <View style={[pickerStyles.header, { backgroundColor: seasonColor }]}>
            <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
              <Text style={pickerStyles.headerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={pickerStyles.headerTitle}>Select a Habit</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Habit List */}
          <View style={pickerStyles.controlSection}>
            <Text style={pickerStyles.sectionTitle}>YOUR HABITS</Text>
            <View style={pickerStyles.listContainer}>
              <ScrollView>
                {myHabits.map((habit, index) => (
                  <TouchableOpacity
                    key={habit.id}
                    style={[
                      pickerStyles.habitRow,
                      index < myHabits.length - 1 && pickerStyles.habitRowBorder,
                    ]}
                    onPress={() => {
                      setSelectedHabit(habit);
                      setIsPickerVisible(false);
                    }}
                  >
                    <Text style={pickerStyles.habitTitle}>{habit.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
    marginBottom: 8,
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
    marginTop: 10,
    padding: 10,
    width: "90%",
    alignItems: "center",
  },
  habitTrackerLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 3,
  },
  habitTrackerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
});

// --- HABIT PICKER MODAL STYLES ---
const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: Platform.OS === "ios" ? 55 : 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerCancel: {
    color: "#fff",
    fontSize: 16,
  },
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
  listContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },
  habitRow: {
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  habitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  habitTitle: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
});
