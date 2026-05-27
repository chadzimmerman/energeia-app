import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getSeasonalColor } from "@/utils/seasons";

const { width: W, height: H } = Dimensions.get("window");
const seasonColor = getSeasonalColor();

// ─── Persistence helpers ──────────────────────────────────────────────────────

const tutorialKey = (userId: string) => `energeia_tutorial_v1_seen_${userId}`;

export async function hasTutorialBeenSeen(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(tutorialKey(userId))) === "true";
  } catch {
    return false;
  }
}

export async function markTutorialSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(tutorialKey(userId), "true");
  } catch {}
}

export async function resetTutorial(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(tutorialKey(userId));
  } catch {}
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Spotlight {
  cx: number; // 0–1 fraction of screen width
  cy: number; // 0–1 fraction of screen height
  r: number;  // ring radius in px
}

interface TutorialStep {
  title: string;
  body: string;
  spotlight: Spotlight | null;
  // Where the text card appears (not where the spotlight is)
  cardSide: "top" | "bottom" | "center";
  // If defined, navigate to this tab when this step becomes active
  tabRoute: string | null;
}

// ─── Steps ───────────────────────────────────────────────────────────────────
//
// Tab bar icon centers (4 equal tabs, fraction of screen width):
//   Habits=0.125  Calendar=0.375  Items=0.625  Settings=0.875
//
// Tab bar icon vertical center ≈ cy 0.935 (49pt bar + ~34pt safe area bottom)
//
// Avatar: left side of screen, roughly cx 0.27
// Stat bars: left-center, roughly cx 0.42, cy 0.29
// Habits list center: cx 0.5, cy 0.64
// Settings profile header center: cx 0.5, cy 0.17

const STEPS: TutorialStep[] = [
  {
    title: "Welcome, Seeker",
    body:
      "Welcome to Energe.ia — where daily habits become a path toward God.\n\n" +
      "Let the brothers guide you.",
    spotlight: null,
    cardSide: "center",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Avatar",
    body:
      "Your character reflects your spiritual journey.\n\n" +
      "Grow in faithfulness to level up and earn sacred vestments.",
    // cx/cy centers on the 100×100 character sprite box:
    // card left=25, char center X=75 → cx≈0.19; header≈91pt, card top=25, char center Y=166 → cy≈0.20
    spotlight: { cx: 0.19, cy: 0.20, r: 55 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Health & Energeia",
    body:
      "❤️ Health — let it reach zero and face death: level reset, item lost.\n\n" +
      "⚡ Energeia — complete habits to fill it and rise in level.",
    spotlight: { cx: 0.58, cy: 0.18, r: 58 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Disciplines",
    body:
      "Your Habits are the practices you've sworn to uphold — daily, weekly, or monthly.\n\n" +
      "Tap a habit's name to edit it. Hold the grip on the left to reorder.",
    spotlight: { cx: 0.5, cy: 0.64, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "Virtue & Vice",
    body:
      "⊕ Complete a habit — earn Energeia and grow your Streak.\n\n" +
      "⊖ Fall to temptation — lose Health and reset your Streak to zero.",
    spotlight: { cx: 0.5, cy: 0.64, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "The Chronicle",
    body:
      "The Calendar records every choice in color.\n\n" +
      "Green = virtue. Red = failure.\n\n" +
      "Select a habit to see its full history.",
    spotlight: { cx: 0.375, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/calendar-tab",
  },
  {
    title: "The Treasury",
    body:
      "Buy and equip sacred items with your Energeia.\n\n" +
      "Each grants hidden blessings. Some are earned only through Seasonal Stories.",
    spotlight: { cx: 0.625, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/items-tab",
  },
  {
    title: "The Archives",
    body:
      "Settings holds your profile, achievements, and Seasonal Stories — " +
      "quests tied to the ancient calendar.",
    spotlight: { cx: 0.875, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Your Covenant",
    body:
      "Your profile and class sit at the top.\n\n" +
      "Below: your Class Guild, Seasonal Stories, and Stable — " +
      "places to journey, quest, and grow alongside others.",
    spotlight: { cx: 0.20, cy: 0.30, r: 70 },
    cardSide: "bottom",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Go Forth",
    body:
      "The monastery awaits your disciplines.\n\n" +
      "May your habits become virtues, and your character draw you " +
      "ever nearer to theosis.\n\n" +
      "☩  May your journey begin  ☩",
    spotlight: null,
    cardSide: "center",
    tabRoute: null,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface TutorialOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  userId: string;
}

export default function TutorialOverlay({
  visible,
  onDismiss,
  userId,
}: TutorialOverlayProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  // Track last navigated route so we only fire navigation on actual tab changes
  const prevRouteRef = useRef<string | null>(null);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(12)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  // Reset + fade in when opened
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      prevRouteRef.current = null;
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      overlayOpacity.setValue(0);
    }
  }, [visible]);

  // Navigate to the step's background tab when the tab changes
  useEffect(() => {
    if (!visible) return;
    const targetRoute = STEPS[stepIndex].tabRoute;
    if (targetRoute && targetRoute !== prevRouteRef.current) {
      router.navigate(targetRoute as any);
      prevRouteRef.current = targetRoute;
    }
  }, [stepIndex, visible]);

  // Slide+fade the card in on each step change
  useEffect(() => {
    if (!visible) return;
    cardOpacity.setValue(0);
    cardTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepIndex, visible]);

  // Pulse the spotlight ring — restart whenever the step changes
  useEffect(() => {
    pulseLoop.current?.stop();
    if (!visible || !step.spotlight) {
      pulseScale.setValue(1);
      pulseOpacity.setValue(1);
      return;
    }
    pulseScale.setValue(1);
    pulseOpacity.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.14,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulseLoop.current.start();
    return () => {
      pulseLoop.current?.stop();
    };
  }, [stepIndex, visible]);

  const goNext = () => {
    if (isLast) {
      markTutorialSeen(userId);
      // Return user to the habits screen after finishing
      router.navigate("/(tabs)" as any);
      onDismiss();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

  const skip = () => {
    markTutorialSeen(userId);
    onDismiss();
  };

  if (!visible) return null;

  // Spotlight geometry
  const sp = step.spotlight;
  const ringDiameter = sp ? sp.r * 2 + 24 : 0;
  const ringLeft = sp ? sp.cx * W - ringDiameter / 2 : 0;
  const ringTop = sp ? sp.cy * H - ringDiameter / 2 : 0;

  // Card vertical anchor
  const topOffset = Platform.OS === "ios" ? 96 : 52;
  const cardStyle =
    step.cardSide === "top"
      ? { top: topOffset }
      : step.cardSide === "bottom"
      ? { bottom: 56 }
      : { top: H * 0.22 };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

        {/* ── Skip ─────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* ── Spotlight ring ───────────────────────────────────── */}
        {sp && (
          <Animated.View
            style={[
              styles.ring,
              {
                width: ringDiameter,
                height: ringDiameter,
                borderRadius: ringDiameter / 2,
                left: ringLeft,
                top: ringTop,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
        )}

        {/* ── Card ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          {/* Step counter */}
          <Text style={styles.stepCounter}>
            {stepIndex + 1} / {STEPS.length}
          </Text>

          {/* Title */}
          <Text style={styles.title}>{step.title}</Text>

          {/* Ornamental divider */}
          <View style={styles.rule} />

          {/* Body — scrollable so no step can overflow the card */}
          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 2 }}
          >
            <Text style={styles.body}>{step.body}</Text>
          </ScrollView>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === stepIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Back / Next */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.backButton, isFirst && { opacity: 0 }]}
              onPress={goBack}
              disabled={isFirst}
              accessibilityLabel="Previous step"
            >
              <FontAwesome
                name="chevron-left"
                size={13}
                color="rgba(255,255,255,0.5)"
              />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={goNext}
              accessibilityLabel={isLast ? "Begin journey" : "Next step"}
            >
              <Text style={styles.nextText}>
                {isLast ? "Begin  ☩" : "Next"}
              </Text>
              {!isLast && (
                <FontAwesome
                  name="chevron-right"
                  size={13}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(6, 2, 20, 0.80)",
  },

  skipButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 22,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  skipText: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 13,
    letterSpacing: 0.3,
  },

  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: seasonColor,
    shadowColor: seasonColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 12,
  },

  card: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#120A2A",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(167, 55, 253, 0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 14,
  },

  stepCounter: {
    fontSize: 11,
    color: "rgba(255,255,255,0.32)",
    textAlign: "center",
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EDE0FF",
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 12,
  },

  rule: {
    height: 1,
    backgroundColor: "rgba(167, 55, 253, 0.26)",
    marginBottom: 12,
  },

  bodyScroll: {
    maxHeight: H * 0.22,
  },

  body: {
    fontSize: 17,
    color: "#C9B8E8",
    lineHeight: 26,
    textAlign: "center",
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 2,
    gap: 5,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  dotActive: {
    width: 16,
    backgroundColor: seasonColor,
  },

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },

  backText: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 14,
  },

  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: seasonColor,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },

  nextText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
