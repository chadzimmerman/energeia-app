import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import HabitItem, { getStreakColor } from "../HabitItem";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));

const habit = (overrides: Partial<Parameters<typeof HabitItem>[0]["habit"]> = {}) => ({
  id: "habit-1",
  title: "Morning prayer",
  is_positive: true,
  is_negative: false,
  streak_level: 3,
  difficulty: 5,
  reset_frequency: "Daily",
  ...overrides,
});

const setup = (overrides = {}) => {
  const onScore = jest.fn();
  const onEdit = jest.fn();
  const drag = jest.fn();
  const props = { habit: habit(), onScore, onEdit, drag, isActive: false, ...overrides };
  const utils = render(<HabitItem {...props} />);
  return { onScore, onEdit, drag, ...utils };
};

describe("getStreakColor", () => {
  // The thresholds are a product decision, not an implementation detail. Blue is
  // the reward for a full week, and an off-by-one demotes a user on the exact
  // day they earn it.
  it("is blue at 7 and above", () => {
    expect(getStreakColor(7)).toBe("#4A90D9");
    expect(getStreakColor(70)).toBe("#4A90D9");
  });

  it("is green from 1 to 6", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(getStreakColor(level)).toBe("#4CAF50");
    }
  });

  it("is yellow at exactly 0", () => {
    expect(getStreakColor(0)).toBe("#F4D35E");
  });

  it("is red below 0", () => {
    expect(getStreakColor(-1)).toBe("#E85A4F");
    expect(getStreakColor(-99)).toBe("#E85A4F");
  });

  it("changes tier exactly at 6 to 7, not 7 to 8", () => {
    expect(getStreakColor(6)).not.toBe(getStreakColor(7));
    expect(getStreakColor(7)).toBe(getStreakColor(8));
  });

  it("gives every tier a distinct color", () => {
    expect(new Set([-1, 0, 3, 9].map(getStreakColor)).size).toBe(4);
  });
});

describe("HabitItem rendering", () => {
  it("shows the habit title", () => {
    setup();
    expect(screen.getByText("Morning prayer")).toBeTruthy();
  });

  it("shows the streak count when the streak is positive", () => {
    setup({ habit: habit({ streak_level: 4, reset_frequency: "Daily" }) });
    expect(screen.getByText("4 day streak")).toBeTruthy();
  });

  it("hides the streak line at zero", () => {
    setup({ habit: habit({ streak_level: 0 }) });
    expect(screen.queryByText(/streak/)).toBeNull();
  });

  it("hides the streak line when the streak is broken", () => {
    setup({ habit: habit({ streak_level: -1 }) });
    expect(screen.queryByText(/streak/)).toBeNull();
  });

  it("labels the streak unit per reset frequency", () => {
    setup({ habit: habit({ streak_level: 2, reset_frequency: "Weekly" }) });
    expect(screen.getByText("2 week streak")).toBeTruthy();

    screen.unmount();
    setup({ habit: habit({ streak_level: 2, reset_frequency: "Monthly" }) });
    expect(screen.getByText("2 month streak")).toBeTruthy();
  });

  it("falls back to days for an unrecognized frequency", () => {
    setup({ habit: habit({ streak_level: 2, reset_frequency: "Fortnightly" }) });
    expect(screen.getByText("2 day streak")).toBeTruthy();
  });

  it("truncates rather than wrapping a long title", () => {
    // numberOfLines={1} keeps a long habit name from pushing the score buttons
    // off the row.
    setup({ habit: habit({ title: "A".repeat(200) }) });
    expect(screen.getByText("A".repeat(200)).props.numberOfLines).toBe(1);
  });
});

describe("HabitItem scoring", () => {
  it("reports an up score for a positive habit", () => {
    const { onScore } = setup({ habit: habit({ is_positive: true, is_negative: false }) });
    fireEvent.press(screen.getByTestId("habit-score-up"));
    expect(onScore).toHaveBeenCalledWith("habit-1", "up");
  });

  it("reports a down score for a negative habit", () => {
    const { onScore } = setup({ habit: habit({ is_positive: false, is_negative: true }) });
    fireEvent.press(screen.getByTestId("habit-score-down"));
    expect(onScore).toHaveBeenCalledWith("habit-1", "down");
  });

  it("shows only the up button for a positive-only habit", () => {
    setup({ habit: habit({ is_positive: true, is_negative: false }) });
    expect(screen.getByTestId("habit-score-up")).toBeTruthy();
    expect(screen.queryByTestId("habit-score-down")).toBeNull();
  });

  it("shows only the down button for a negative-only habit", () => {
    setup({ habit: habit({ is_positive: false, is_negative: true }) });
    expect(screen.getByTestId("habit-score-down")).toBeTruthy();
    expect(screen.queryByTestId("habit-score-up")).toBeNull();
  });

  it("shows both buttons for a habit that is both", () => {
    setup({ habit: habit({ is_positive: true, is_negative: true }) });
    expect(screen.getByTestId("habit-score-up")).toBeTruthy();
    expect(screen.getByTestId("habit-score-down")).toBeTruthy();
  });

  it("shows neither button when the habit is neither", () => {
    // A habit that scores in no direction still has to render, because the
    // editor allows both switches to be turned off.
    setup({ habit: habit({ is_positive: false, is_negative: false }) });
    expect(screen.queryByTestId("habit-score-up")).toBeNull();
    expect(screen.queryByTestId("habit-score-down")).toBeNull();
    expect(screen.getByText("Morning prayer")).toBeTruthy();
  });

  it("scores each press separately rather than debouncing", () => {
    const { onScore } = setup({ habit: habit({ is_positive: true }) });
    fireEvent.press(screen.getByTestId("habit-score-up"));
    fireEvent.press(screen.getByTestId("habit-score-up"));
    expect(onScore).toHaveBeenCalledTimes(2);
  });

  it("opens the editor when the title is pressed", () => {
    const { onEdit } = setup();
    fireEvent.press(screen.getByTestId("habit-title"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "habit-1" }));
  });

  it("starts a drag from the handle", () => {
    const { drag } = setup();
    fireEvent(screen.getByTestId("habit-drag"), "pressIn");
    expect(drag).toHaveBeenCalled();
  });
});
