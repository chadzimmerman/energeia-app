import CharacterStats from "@/components/CharacterStats";
import { View as ThemedView } from "@/components/Themed";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Get screen width for responsive sizing
const screenWidth = Dimensions.get("window").width;
// Calculate the size of a single day cell for a 7-column grid with padding
// 20px padding on left/right edges + 6 gaps of 5px = 20 + 30 = 50px total horizontal buffer
const totalHorizontalPadding = 40; // 20px on each side of the main calendar container
const gap = 5; // Gap between days
const dayCellSize = Math.floor(
  (screenWidth - totalHorizontalPadding - 6 * gap) / 7
);

// --- MOCK DATA ---

// Habit Status Colors
const STATUS_COLORS = {
  green: "#2ECC71", // Positive/Success
  orange: "#E67E22", // Difficult/Partial
  red: "#E74C3C", // Failure/Missed
  grey: "#ECF0F1", // Untracked/Blank
};

// Mock Habit Data (Year-Month-Day format)
// Using data for March 2026 as shown in the screenshot
const mockHabitData: { [key: string]: keyof typeof STATUS_COLORS } = {
  "2026-2-28": "green", // Previous month day example
  "2026-3-1": "grey",
  "2026-3-2": "green",
  "2026-3-3": "green",
  "2026-3-4": "green",
  "2026-3-5": "green",
  "2026-3-6": "grey",
  "2026-3-7": "orange",
  "2026-3-8": "orange",
  "2026-3-9": "red",
  "2026-3-10": "green",
  "2026-3-11": "green",
  "2026-3-12": "green",
  "2026-3-13": "green",
  "2026-3-14": "orange",
  "2026-3-15": "orange",
  "2026-3-16": "green",
  "2026-3-17": "orange",
  "2026-3-18": "green",
  "2026-3-19": "green",
  "2026-3-20": "green",
  "2026-3-21": "red",
  "2026-3-22": "red",
  "2026-3-23": "orange",
  "2026-3-24": "green",
  "2026-3-25": "green",
  "2026-3-26": "green",
  "2026-3-27": "orange",
  "2026-3-28": "orange",
  "2026-3-29": "green",
  "2026-3-30": "green",
  "2026-3-31": "grey",
  "2026-4-1": "grey", // Next month day example
};

// --- UTILITY FUNCTIONS ---

const getMonthName = (date: Date) =>
  date.toLocaleString("default", { month: "long" });

/**
 * Calculates the day structure for the given month/year.
 * Returns an array of day numbers, including leading empty spaces and trailing padding.
 */
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // getDay() returns 0 for Sunday, 1 for Monday...
  // We want Monday (1) to be the start of the week (index 0).
  const firstDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

  const days: (number | null)[] = [];

  // 1. Add leading empty spaces (for days before the 1st of the month)
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }

  // 2. Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // 3. Add trailing empty spaces to complete the last week (optional but good practice)
  const totalCells = days.length;
  const trailingPadding = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailingPadding; i++) {
    days.push(null);
  }

  return days;
};

// --- COMPONENTS ---

/**
 * Renders a single calendar day cell.
 */
const DayCell: React.FC<{
  day: number | null;
  year: number;
  month: number;
}> = ({ day, year, month }) => {
  if (day === null) {
    return <View style={calendarStyles.dayCellBlank} />;
  }

  // Format key to match mock data (e.g., '2026-3-15')
  const dateKey = `${year}-${month + 1}-${day}`;
  const status = mockHabitData[dateKey] || "grey";
  const color = STATUS_COLORS[status];

  const handleDayPress = () => {
    // This is where the modal will pop up in the next step
    console.log(`Day ${dateKey} clicked. Status: ${status}.`);
    // Placeholder for opening the modal: openDayModal({ date: dateKey, status });
  };

  return (
    <TouchableOpacity
      style={[calendarStyles.dayCell, { backgroundColor: color }]}
      onPress={handleDayPress}
      activeOpacity={0.7}
      disabled={status === "grey"} // Optionally disable clicking on untracked days
    >
      <Text style={calendarStyles.dayText}>{day}</Text>
    </TouchableOpacity>
  );
};

/**
 * Main calendar view with month navigation.
 */
const CalendarView: React.FC = () => {
  // Start date (March 2026 as seen in the screenshot)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
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
        {days.map((day, index) => (
          <DayCell key={index} day={day} year={year} month={month} />
        ))}
      </View>
    </View>
  );
};

/**
 * Habit Tracking Selector
 */
const HabitTrackerSection: React.FC = () => {
  // Mock tracked habit
  const [trackedHabit, setTrackedHabit] = useState("Reading");

  const handleSelectHabit = () => {
    // Placeholder for habit selection modal
    console.log("Open habit selection screen.");
  };

  return (
    <TouchableOpacity
      style={calendarStyles.habitTrackerBox}
      onPress={handleSelectHabit}
    >
      <Text style={calendarStyles.habitTrackerLabel}>Tracking Habit:</Text>
      <Text style={calendarStyles.habitTrackerName}>{trackedHabit}</Text>
    </TouchableOpacity>
  );
};

// --- MAIN TAB SCREEN ---

export default function CalendarTabScreen() {
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
        <CalendarView />
        <HabitTrackerSection />
      </ScrollView>

      {/* <EditScreenInfo path="app/(tabs)/calendar-tab.tsx" /> */}
    </ThemedView>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // The main container should fill the screen
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
    // Match the dark, centered look of the screenshot
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
    // Change to 'space-around' or 'space-evenly' if 'space-between' doesn't look right,
    // but the issue is more likely in the width calculation/application.
    justifyContent: "space-between",
    paddingHorizontal: 0,
    marginBottom: 5,
  },
  dayLabelText: {
    // This width must be exactly the size of a day cell to ensure alignment
    width: dayCellSize,
    textAlign: "center", // Centering the text within the label width
    fontWeight: "bold",
    color: "#666",
  },
  // --- Day Grid ---
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Use 'space-between' to distribute the cells across the width
    justifyContent: "space-between",
    // We remove the gap/margin from the dayCell and use columnGap/rowGap on the grid container
    columnGap: gap,
    rowGap: gap,
  },
  dayCell: {
    // The explicit size of the cell is now correctly calculated to fit 7 in a row with gaps
    width: dayCellSize,
    height: dayCellSize,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center", // This centers the day number text
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    // Removed margin: gap/2 here to allow columnGap/rowGap on the parent to manage spacing
  },
  dayCellBlank: {
    width: dayCellSize,
    height: dayCellSize,
    // margin: gap / 2, // Removed margin here too
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

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     // The main container should fill the screen
//   },
//   scrollContent: {
//     flexGrow: 1,
//     paddingHorizontal: 10,
//     paddingBottom: 20,
//     alignItems: "center",
//     width: "100%",
//   },
// });

// const calendarStyles = StyleSheet.create({
//   calendarContainer: {
//     width: "100%",
//     paddingHorizontal: 10,
//     paddingTop: 10,
//     backgroundColor: "transparent",
//   },
//   // --- Header ---
//   monthHeader: {
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 20,
//   },
//   monthTitle: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#333",
//     marginHorizontal: 10,
//     // Match the dark, centered look of the screenshot
//   },
//   navButton: {
//     padding: 10,
//   },
//   navText: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#333",
//   },
//   // --- Day Labels ---
//   dayLabelsRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingHorizontal: 0,
//     marginBottom: 5,
//   },
//   dayLabelText: {
//     width: dayCellSize,
//     textAlign: "center",
//     fontWeight: "bold",
//     color: "#666",
//   },
//   // --- Day Grid ---
//   dayGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "flex-start",
//   },
//   dayCell: {
//     width: dayCellSize,
//     height: dayCellSize,
//     margin: gap / 2, // Use half the gap for margin on all sides to create the gap effect
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 1,
//     elevation: 1,
//   },
//   dayCellBlank: {
//     width: dayCellSize,
//     height: dayCellSize,
//     margin: gap / 2,
//     backgroundColor: "transparent", // Empty cells are transparent
//   },
//   dayText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "white", // Text is white/light on colored days
//   },
//   // Override for grey/untracked days to have dark text
//   dayText_grey: {
//     color: "#333",
//   },
//   // --- Habit Tracker ---
//   habitTrackerBox: {
//     marginTop: 30,
//     padding: 20,
//     width: "90%",
//     alignItems: "center",
//   },
//   habitTrackerLabel: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 5,
//   },
//   habitTrackerName: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#333",
//   },
// });
