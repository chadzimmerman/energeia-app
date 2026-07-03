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
  title: React.ReactNode;
  body: React.ReactNode;
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
    title: "...!",
    body: (
      <>
        {"Hey — hey, you! "}
        <Text style={{ fontStyle: "italic" }}>Bwak!</Text>
        {"\n\nYou... "}
        <Text style={{ fontStyle: "italic" }}>Cluck! Cluck!</Text>
        {"...\n\n...You can actually understand me?!"}
      </>
    ),
    spotlight: null,
    cardSide: "center",
    tabRoute: "/(tabs)",
  },
  {
    title: "Oh my goodness!",
    body: (
      <>
        {"I have not seen you around here before! "}
        <Text style={{ fontStyle: "italic" }}>Bwak bwak!</Text>
        {" You must already be on the path of "}
        <Text style={{ fontStyle: "italic" }}>theosis</Text>
        {" if you found your way all the way here!\n\nWait... what? "}
        <Text style={{ fontStyle: "italic" }}>B-kawk?!</Text>
        {" What is theosis? You don't know?!\n\nTheosis is participation in the energies of this land — the "}
        <Text style={{ fontStyle: "italic" }}>Energeia</Text>
        {". "}
        <Text style={{ fontStyle: "italic" }}>Cluck cluck…</Text>
        {" As we grow closer to the source of all things, we participate in them more and more."}
      </>
    ),
    spotlight: null,
    cardSide: "center",
    tabRoute: "/(tabs)",
  },
  {
    title: <>{"Welcome to the World of "}<Text style={{ fontStyle: "italic" }}>Energe.ia</Text></>,
    body: (
      <>
        {"Well then — "}
        <Text style={{ fontStyle: "italic" }}>cluck</Text>
        {" — this is your little retreat from the world. A place to tend your daily habits, grow in virtue, and walk the ancient paths.\n\n"}
        <Text style={{ fontStyle: "italic" }}>Cluck cluck…</Text>
        {" "}
        <Text style={{ fontStyle: "italic" }}>The fathers of our traditions walk with you here.</Text>
      </>
    ),
    spotlight: null,
    cardSide: "center",
    tabRoute: "/(tabs)",
  },
  {
    title: "That's You",
    body: (
      <>
        {"That little soul up there is yours. "}
        <Text style={{ fontStyle: "italic" }}>Bwak!</Text>
        {" Every good thing you do out in the real world shows up right here.\n\nGo on — grow!"}
      </>
    ),
    spotlight: { cx: 0.23, cy: 0.331, r: 65 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Body & Spirit",
    body: (
      <>
        {"❤️ "}
        <Text style={{ fontStyle: "italic" }}>Health</Text>
        {" keeps you standing. Let it reach zero and you'll face a hard reset: your level progress will reset to 1, and a random item will disappear. "}
        <Text style={{ fontStyle: "italic" }}>B-kawk!</Text>
        {"\n\n⚡ "}
        <Text style={{ fontStyle: "italic" }}>Energeia</Text>
        {" is what you earn doing good works and avoiding the bad ones. "}
        <Text style={{ fontStyle: "italic" }}>Bwak bwak!</Text>
        {" Fill it up. As you grow in good deeds, so does your level!"}
      </>
    ),
    spotlight: { cx: 0.188, cy: 0.188, r: 58 },
    cardSide: "bottom",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Daily Work",
    body: (
      <>
        {"These are the habits you've sworn to — daily, weekly, or on your own schedule. "}
        <Text style={{ fontStyle: "italic" }}>Cluck.</Text>
        {"\n\nTap a habit's name to change it. Hold the grip on the left to move it around. "}
        <Text style={{ fontStyle: "italic" }}>Bwak!</Text>
        {"\n\nAll those who came before you tended themselves as farmers till soil. Tend to yourself diligently as they did."}
      </>
    ),
    spotlight: { cx: 0.5, cy: 0.693, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "The Two Ways",
    body: (
      <>
        {"⊕ marks a good day — earn "}
        <Text style={{ fontStyle: "italic" }}>Energeia</Text>
        {" and watch your streak grow. "}
        <Text style={{ fontStyle: "italic" }}>Bwak bwak!</Text>
        {"\n\n⊖ marks a stumble — lose some health and reset the streak. "}
        <Text style={{ fontStyle: "italic" }}>Cluck cluck…</Text>
        {"\n\nIt's alright. One father once told me 'Struggle until your last breath!' He was very wise."}
      </>
    ),
    spotlight: { cx: 0.5, cy: 0.693, r: 88 },
    cardSide: "top",
    tabRoute: "/(tabs)",
  },
  {
    title: "Your Record",
    body: (
      <>
        {"Every choice gets written down in color. "}
        <Text style={{ fontStyle: "italic" }}>Cluck.</Text>
        {" Green for the good days, red for the hard ones.\n\nTap any day on the calendar to see what happened. "}
        <Text style={{ fontStyle: "italic" }}>Bwak!</Text>
        {" Honest records make for honest growth."}
      </>
    ),
    spotlight: { cx: 0.375, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/calendar-tab",
  },
  {
    title: "The Market",
    body: (
      <>
        {"Spend your "}
        <Text style={{ fontStyle: "italic" }}>Energeia</Text>
        {" on sacred items over in the market. "}
        <Text style={{ fontStyle: "italic" }}>B-kawk!</Text>
        {" Equip what you earn.\n\nSome items do more than just look nice, if you know what I mean. "}
        <Text style={{ fontStyle: "italic" }}>Cluck cluck…</Text>
      </>
    ),
    spotlight: { cx: 0.625, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/items-tab",
  },
  {
    title: "Home Base",
    body: (
      <>
        {"Settings holds your profile, achievements, and seasonal stories. "}
        <Text style={{ fontStyle: "italic" }}>Cluck!</Text>
        {"\n\nThere's a stable there too. "}
        <Text style={{ fontStyle: "italic" }}>Bwak…</Text>
        {" That one's my particular favorite — come on over when you're ready."}
      </>
    ),
    spotlight: { cx: 0.875, cy: 0.935, r: 36 },
    cardSide: "top",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Right There",
    body: (
      <>
        {"That's you at the top — your class, your guild, your stories. "}
        <Text style={{ fontStyle: "italic" }}>Cluck cluck!</Text>
        {" Everything you're building.\n\nCome back here when you want to see how far you've come."}
      </>
    ),
    spotlight: { cx: 0.20, cy: 0.30, r: 70 },
    cardSide: "bottom",
    tabRoute: "/(tabs)/settings",
  },
  {
    title: "Off You Go",
    body: null, // rendered dynamically based on playerClass — see buildLastStepBody
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
  playerClass?: string;
}

const buildLastStepBody = (_playerClass?: string): React.ReactNode => (
  <>
    {"This hermitage awaits your practice and prayers.\n\n"}
    <Text style={{ fontStyle: "italic" }}>Bwak!</Text>
    {" Every good work matters. Tend to your habits — they're the heartbeat of this little retreat from the world. "}
    <Text style={{ fontStyle: "italic" }}>Cluck cluck…</Text>
    {"\n\n☩  Your journey has only just begun.  ☩"}
  </>
);

export default function TutorialOverlay({
  visible,
  onDismiss,
  userId,
  playerClass,
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
  const jumpAnim = useRef(new Animated.Value(0)).current;

  const triggerJump = () => {
    jumpAnim.setValue(0);
    Animated.sequence([
      Animated.timing(jumpAnim, { toValue: -18, duration: 120, useNativeDriver: true }),
      Animated.spring(jumpAnim, { toValue: 0, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  };

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
  }, [visible, overlayOpacity]);

  // Navigate to the step's background tab when the tab changes
  useEffect(() => {
    if (!visible) return;
    const targetRoute = STEPS[stepIndex].tabRoute;
    if (targetRoute && targetRoute !== prevRouteRef.current) {
      router.navigate(targetRoute as any);
      prevRouteRef.current = targetRoute;
    }
  }, [stepIndex, visible, router]);

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
  }, [stepIndex, visible, cardOpacity, cardTranslate]);

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
  }, [stepIndex, visible, pulseOpacity, pulseScale, step.spotlight]);

  const goNext = () => {
    triggerJump();
    if (isLast) {
      markTutorialSeen(userId);
      router.navigate("/(tabs)" as any);
      onDismiss();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      triggerJump();
      setStepIndex((i) => i - 1);
    }
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
          {/* Henry mascot — top for bottom/center cards, bottom for top cards */}
          <Animated.Image
            source={require("../assets/sprites/animals/new_animals/hen.png")}
            style={[
              styles.henryMascot,
              step.cardSide === "top" ? { bottom: -112 } : { top: -112 },
              { transform: [{ translateY: jumpAnim }] },
            ]}
            resizeMode="contain"
          />

          {/* Speech bubble tail — flips direction with Henry */}
          <View style={step.cardSide === "top" ? styles.speechTailBottom : styles.speechTail} />

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
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <Text style={styles.body}>{isLast ? buildLastStepBody(playerClass) : step.body}</Text>
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
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 14,
  },

  cluckText: {
    fontSize: 12,
    color: "rgba(0,0,0,0.30)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },

  henryMascot: {
    position: "absolute",
    left: 4,
    width: 104,
    height: 104,
    zIndex: 20,
  },

  speechTail: {
    position: "absolute",
    top: -12,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fff",
  },

  speechTailBottom: {
    position: "absolute",
    bottom: -12,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },

  stepCounter: {
    fontSize: 11,
    color: "rgba(0,0,0,0.35)",
    textAlign: "center",
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
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
    maxHeight: H * 0.30,
  },

  body: {
    fontSize: 17,
    color: "#444",
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
    backgroundColor: "rgba(0,0,0,0.15)",
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
    color: "rgba(0,0,0,0.45)",
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
