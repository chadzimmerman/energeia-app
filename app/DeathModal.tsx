import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// ANGEL IMAGES — drop your 9:16 portrait art here:
//   assets/sprites/characters/angel/angel-male.png
//   assets/sprites/characters/angel/angel-female.png
//
// Until those files exist, the warrior/princess sprites are used as placeholders.
// ─────────────────────────────────────────────────────────────────────────────
const ANGEL_IMAGES = {
  male: require("../assets/sprites/characters/angel/angel-male.png"),
  female: require("../assets/sprites/characters/angel/angel-female.png"),
};

const { height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.55;

interface Props {
  visible: boolean;
  gender: "male" | "female";
  lostItemName: string | null;
  onRise: () => void;
}

export default function DeathModal({ visible, gender, lostItemName, onRise }: Props) {
  const address = gender === "female" ? "sister" : "brother";

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* ── Angel Image ── */}
        <View style={styles.imageSection}>
          <Image
            source={ANGEL_IMAGES[gender]}
            style={styles.angelImage}
            resizeMode="cover"
          />
          {/* Dark fade at bottom of image bleeding into the text panel */}
          <View style={styles.imageFade} />
        </View>

        {/* ── Text Panel ── */}
        <ScrollView
          style={styles.textScroll}
          contentContainerStyle={styles.textContent}
          bounces={false}
        >
          <Text style={styles.title}>You Have Fallen</Text>

          <Text style={styles.body}>
            {`The righteous fall seven times and rise again.\n\nYour energeia is spent, your goods scattered — but not your soul. Take up your cross, ${address}, and begin anew.\n\nThe path to theosis is walked a thousand times. Each rising is more glorious than the last.`}
          </Text>

          {/* What was lost */}
          <View style={styles.lossRow}>
            <LossPill text="Returned to Level 1" />
            <LossPill text="All Energeia lost" />
            {lostItemName ? <LossPill text={`Lost: ${lostItemName}`} /> : null}
          </View>

          <TouchableOpacity
            style={styles.riseButton}
            onPress={onRise}
            activeOpacity={0.8}
          >
            <Text style={styles.riseButtonText}>Rise Again</Text>
          </TouchableOpacity>

          <Text style={styles.scripture}>
            — Proverbs 24:16
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const LossPill = ({ text }: { text: string }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Image
  imageSection: {
    height: IMAGE_HEIGHT,
    width: "100%",
  },
  angelImage: {
    width: "100%",
    height: "100%",
  },
  imageFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "rgba(0,0,0,0.8)",
  },

  // Text
  textScroll: {
    flex: 1,
  },
  textContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 18,
  },
  body: {
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 24,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 24,
  },

  // Loss pills
  lossRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    backgroundColor: "rgba(200,30,50,0.2)",
    borderWidth: 1,
    borderColor: "rgba(200,80,80,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: "rgba(255,170,170,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },

  // Rise button
  riseButton: {
    backgroundColor: "#A737FD",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 60,
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  riseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  scripture: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    textAlign: "center",
  },
});
