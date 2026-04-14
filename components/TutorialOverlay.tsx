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

export const TUTORIAL_STORAGE_KEY = "energeia_tutorial_v1_seen";

export async function hasTutorialBeenSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  } catch {}
}

export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
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
      "You stand at the threshold of Energe.ia — a monastery of the soul, " +
      "built upon the ancient teaching of Energeia: the divine grace " +
      "that flows into us as we draw ever nearer to God.\n\n" +
      "Let the brothers show you the way.",
    spotlight: null,
    cardSide: "center",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Avatar",
    body:
      "This is your character — your reflection in the spiritual realm. " +
      "Through faithful practice your avatar grows in strength, rises in " +
      "level, and may be adorned with sacred vestments and holy companions.",
    // Character sprite is on the LEFT side of the screen
    spotlight: { cx: 0.27, cy: 0.22, r: 68 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Health & Energeia",
    body:
      "The crimson bar is your Health — your resilience against temptation. " +
      "Let it reach zero and face death: your level reset, an item lost.\n\n" +
      "The golden bar is your Energeia — divine energy earned through holy " +
      "practice. Fill it to rise in level and unlock greater power.",
    // Stat bars are left-of-center, below the sprite
    spotlight: { cx: 0.42, cy: 0.29, r: 48 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Disciplines",
    body:
      "These are your Habits — daily, weekly, or monthly practices you " +
      "have sworn to uphold. Each act of virtue ripples through your soul.",
    spotlight: { cx: 0.5, cy: 0.64, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "Virtue & Vice",
    body:
      "Press ⊕ when you fulfill a practice — Energeia earned, Streak grows.\n\n" +
      "Press ⊖ when you have fallen — Health lost, Streak extinguished.",
    spotlight: { cx: 0.5, cy: 0.64, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "The Chronicle",
    body:
      "The Calendar is your sacred Chronicle — colored by fidelity or " +
      "failure. Green marks days of virtue; red marks falls.\n\n" +
      "Select any habit to view its history laid bare across the months.",
    // Calendar tab icon (2nd tab), navigates to calendar in background
    spotlight: { cx: 0.375, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/calendar-tab",
  },
  {
    title: "The Treasury",
    body:
      "The Items tab holds sacred objects, adornments, and companions — " +
      "earned through perseverance or purchased with Energeia.\n\n" +
      "Equip them to receive hidden blessings. Some are granted only by " +
      "completing the Seasonal Stories.",
    // Items tab icon (3rd tab), navigates to items in background
    spotlight: { cx: 0.625, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/items-tab",
  },
  {
    title: "The Archives",
    body:
      "Settings holds your profile, achievements, and the Seasonal Stories — " +
      "sacred quests that unfold through the church calendar.\n\n" +
      "Complete them to earn rare vestments and blessings of each season.",
    // Settings tab icon (4th tab), navigates to settings in background
    spotlight: { cx: 0.875, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Your Covenant",
    body:
      "At the top of the Archives lives your spiritual profile — your name, " +
      "class, and level of ascent.\n\n" +
      "Below it: your Class Guild to journey alongside fellow monks, knights, " +
      "and nobles; the Seasonal Stories to pursue sacred quests through the " +
      "Orthodox year; and the Stable for your animal companions.",
    // Profile header at the top of the settings screen
    spotlight: { cx: 0.5, cy: 0.17, r: 95 },
    cardSide: "bottom",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Go Forth",
    body:
      "The monastery awaits your disciplines.\n\n" +
      "May your habits become virtues, your virtues become character, and " +
      "your character draw you ever nearer to theosis.\n\n" +
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
}

export default function TutorialOverlay({
  visible,
  onDismiss,
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
      markTutorialSeen();
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
    markTutorialSeen();
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
    maxHeight: H * 0.20,
  },

  body: {
    fontSize: 15,
    color: "#C9B8E8",
    lineHeight: 24,
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
