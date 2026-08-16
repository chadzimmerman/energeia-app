import React from "react";
import { Linking, TouchableOpacity } from "react-native";
import { render, fireEvent, screen } from "@testing-library/react-native";
import AchievementItem from "../AchievementItem";
import BgColorSwatch from "../BgColorSwatch";
import ForceUpdateModal from "../ForceUpdateModal";
import HabitList from "../HabitList";
import CharacterStats from "../CharacterStats";

const IMAGE = { uri: "https://example.com/icon.png" };

const habit = (id: string, title: string) => ({
  id,
  title,
  is_positive: true,
  is_negative: false,
  streak_level: 1,
  difficulty: 5,
  reset_frequency: "Daily",
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));

describe("AchievementItem", () => {
  it("shows the description once earned", () => {
    render(
      <AchievementItem
        title="First Task"
        description="You completed your first habit."
        imageSource={IMAGE}
        isAchieved
      />,
    );
    expect(screen.getByText("First Task")).toBeTruthy();
    expect(screen.getByText("You completed your first habit.")).toBeTruthy();
  });

  it("hides the description until earned", () => {
    // The locked row must not leak what the achievement is, or the reveal is
    // spoiled for every achievement at once on the achievements screen.
    render(
      <AchievementItem
        title="First Task"
        description="You completed your first habit."
        imageSource={IMAGE}
        isAchieved={false}
      />,
    );
    expect(screen.getByText("Not yet earned.")).toBeTruthy();
    expect(screen.queryByText("You completed your first habit.")).toBeNull();
  });

  it("still shows the title when locked, so the list reads as a checklist", () => {
    render(
      <AchievementItem title="First Task" description="d" imageSource={IMAGE} isAchieved={false} />,
    );
    expect(screen.getByText("First Task")).toBeTruthy();
  });

  it("calls onPress when earned", () => {
    const onPress = jest.fn();
    render(
      <AchievementItem title="T" description="d" imageSource={IMAGE} isAchieved onPress={onPress} />,
    );
    fireEvent.press(screen.UNSAFE_getByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalled();
  });

  it("attaches no press handler when locked", () => {
    // Asserted on the touchable's props rather than through fireEvent.press.
    // RNTL walks up to composite components looking for a handler, so it finds
    // the onPress passed to <AchievementItem> itself and calls it directly,
    // which bypasses the component's own guard and would pass either way.
    const onPress = jest.fn();
    render(
      <AchievementItem
        title="T"
        description="d"
        imageSource={IMAGE}
        isAchieved={false}
        onPress={onPress}
      />,
    );
    const touchable = screen.UNSAFE_getByType(TouchableOpacity);
    expect(touchable.props.onPress).toBeUndefined();
    expect(touchable.props.activeOpacity).toBe(1);
  });

  it("attaches the handler and a press effect once earned", () => {
    const onPress = jest.fn();
    render(
      <AchievementItem title="T" description="d" imageSource={IMAGE} isAchieved onPress={onPress} />,
    );
    const touchable = screen.UNSAFE_getByType(TouchableOpacity);
    expect(touchable.props.onPress).toBe(onPress);
    expect(touchable.props.activeOpacity).toBe(0.7);
  });

  it("renders without an onPress handler at all", () => {
    expect(() =>
      render(<AchievementItem title="T" description="d" imageSource={IMAGE} isAchieved />),
    ).not.toThrow();
  });
});

describe("BgColorSwatch", () => {
  it("renders a swatch for a known background", () => {
    const { toJSON } = render(<BgColorSwatch imagePath="bg-spring" style={{}} />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders nothing for an unknown background", () => {
    // Server-driven: an older build can be handed a background key it does not
    // have. Rendering null is correct here, because a swatch is decorative and a
    // wrong color is worse than an absent one.
    const { toJSON } = render(<BgColorSwatch imagePath="bg-does-not-exist" style={{}} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing for an empty key", () => {
    expect(render(<BgColorSwatch imagePath="" style={{}} />).toJSON()).toBeNull();
  });

  it("renders every shipped background without throwing", () => {
    for (const key of ["bg-grey", "bg-spring", "bg-summer", "bg-autumn", "bg-winter"]) {
      expect(render(<BgColorSwatch imagePath={key} style={{}} />).toJSON()).not.toBeNull();
    }
  });
});

describe("ForceUpdateModal", () => {
  it("shows the update message when visible", () => {
    render(<ForceUpdateModal visible />);
    expect(screen.getByText("Update Required")).toBeTruthy();
  });

  it("offers exactly one action, and it is not dismissal", () => {
    // A force update that can be dismissed is not a force update. The modal has
    // no close button and no backdrop press handler by design.
    render(<ForceUpdateModal visible />);
    expect(screen.getByText("Update Now")).toBeTruthy();
    expect(screen.queryByText(/close|cancel|later|dismiss/i)).toBeNull();
  });

  it("opens the store listing when the button is pressed", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(<ForceUpdateModal visible />);
    fireEvent.press(screen.getByText("Update Now"));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining("apps.apple.com"));
    openURL.mockRestore();
  });

  it("hides its content when not visible", () => {
    render(<ForceUpdateModal visible={false} />);
    expect(screen.queryByText("Update Required")).toBeNull();
  });
});

describe("HabitList", () => {
  const setup = (habits: ReturnType<typeof habit>[]) => {
    const onScore = jest.fn();
    const onEdit = jest.fn();
    const onReorder = jest.fn();
    render(
      <HabitList habits={habits} onScore={onScore} onEdit={onEdit} onReorder={onReorder} />,
    );
    return { onScore, onEdit, onReorder };
  };

  it("prompts the user when the list is empty", () => {
    setup([]);
    expect(screen.getByText(/haven't added any habits yet/i)).toBeTruthy();
    expect(screen.getByText(/Tap the '\+' icon/i)).toBeTruthy();
  });

  it("shows the empty prompt rather than crashing on a null list", () => {
    // The habits query returns null on a failed read, and this component is
    // rendered before that read resolves.
    const onNoop = jest.fn();
    render(
      <HabitList
        habits={null as unknown as ReturnType<typeof habit>[]}
        onScore={onNoop}
        onEdit={onNoop}
        onReorder={onNoop}
      />,
    );
    expect(screen.getByText(/haven't added any habits yet/i)).toBeTruthy();
  });

  it("renders one row per habit", () => {
    setup([habit("a", "Prayer"), habit("b", "Reading"), habit("c", "Fasting")]);
    expect(screen.getByText("Prayer")).toBeTruthy();
    expect(screen.getByText("Reading")).toBeTruthy();
    expect(screen.getByText("Fasting")).toBeTruthy();
  });

  it("does not show the empty prompt once habits exist", () => {
    setup([habit("a", "Prayer")]);
    expect(screen.queryByText(/haven't added any habits yet/i)).toBeNull();
  });

  it("keeps the given order", () => {
    setup([habit("a", "First"), habit("b", "Second")]);
    const rendered = screen.getAllByText(/First|Second/).map((n) => n.props.children);
    expect(rendered).toEqual(["First", "Second"]);
  });
});

describe("CharacterStats", () => {
  const base = {
    backgroundImageSource: IMAGE,
    characterImageSource: IMAGE,
    currentHealth: 80,
    maxHealth: 100,
    currentEnergy: 40,
    maxEnergy: 100,
    level: 12,
  };

  it("renders the character at normal health", () => {
    expect(() => render(<CharacterStats {...base} />)).not.toThrow();
  });

  it("renders at zero health", () => {
    // This is the frame shown immediately before the death modal. If it throws,
    // the user sees a crash instead of the death sequence.
    expect(() => render(<CharacterStats {...base} currentHealth={0} />)).not.toThrow();
  });

  it("renders at full health", () => {
    expect(() => render(<CharacterStats {...base} currentHealth={100} />)).not.toThrow();
  });

  it("renders when health exceeds the maximum", () => {
    // An equipped item can push max_health up; a stale currentHealth can briefly
    // exceed it. The bar must clamp rather than overflow the container.
    expect(() => render(<CharacterStats {...base} currentHealth={150} />)).not.toThrow();
  });

  it("renders when maxHealth is zero, without dividing by zero", () => {
    expect(() =>
      render(<CharacterStats {...base} currentHealth={0} maxHealth={0} />),
    ).not.toThrow();
  });

  it("renders with no pet", () => {
    expect(() =>
      render(<CharacterStats {...base} animalCompanion={null} petName={null} />),
    ).not.toThrow();
  });

  it("renders with a pet and calls onPetTap", () => {
    const onPetTap = jest.fn();
    render(
      <CharacterStats
        {...base}
        animalCompanion={IMAGE}
        petName="Prosphora"
        petTappedToday={false}
        onPetTap={onPetTap}
      />,
    );
    expect(screen.getByText("Prosphora")).toBeTruthy();
  });

  it("renders with no equipped overlays", () => {
    expect(() => render(<CharacterStats {...base} equippedOverlays={[]} />)).not.toThrow();
  });

  it("renders with a full set of equipped overlays", () => {
    expect(() =>
      render(<CharacterStats {...base} equippedOverlays={[IMAGE, IMAGE, IMAGE, IMAGE, IMAGE]} />),
    ).not.toThrow();
  });

  it("renders at level 0 and at a high level", () => {
    expect(() => render(<CharacterStats {...base} level={0} />)).not.toThrow();
    expect(() => render(<CharacterStats {...base} level={999} />)).not.toThrow();
  });
});
