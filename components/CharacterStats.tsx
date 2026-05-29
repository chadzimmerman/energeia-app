import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");

// Define props for the component
interface CharacterStatsProps {
  backgroundImageSource: ImageSourcePropType;
  characterImageSource: ImageSourcePropType;
  equippedCharacterSet?: ImageSourcePropType | null;
  currentHealth: number;
  maxHealth: number;
  currentEnergy: number;
  maxEnergy: number;
  level?: number;
  equippedOverlays?: ImageSourcePropType[];
  animalCompanion?: ImageSourcePropType | null;
  petName?: string | null;
  petTappedToday?: boolean;
  onPetTap?: () => void;
  wallItems?: ImageSourcePropType[];
  floorItems?: ImageSourcePropType[];
  handItems?: ImageSourcePropType[];
  characterBgColors?: { wall: string; floor: string };
}

const CharacterStats: React.FC<CharacterStatsProps> = ({
  backgroundImageSource,
  characterImageSource,
  equippedCharacterSet = null,
  currentHealth,
  maxHealth,
  currentEnergy,
  maxEnergy,
  level = 1,
  equippedOverlays = [],
  animalCompanion = null,
  petName = null,
  petTappedToday = false,
  onPetTap,
  wallItems = [],
  floorItems = [],
  handItems = [],
  characterBgColors = { wall: '#EBEBEB', floor: '#C0C0C0' },
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;

  const handleAnimalTap = () => {
    Animated.sequence([
      Animated.timing(jumpAnim, { toValue: -18, duration: 120, useNativeDriver: true }),
      Animated.spring(jumpAnim, { toValue: 0, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();

    if (!petTappedToday) {
      floatY.setValue(0);
      floatOpacity.setValue(1);
      setShowBonus(true);
      Animated.parallel([
        Animated.timing(floatY, { toValue: -50, duration: 1000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(floatOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start(() => setShowBonus(false));
      onPetTap?.();
    }
  };

  // When a character set is equipped it replaces the base sprite entirely.
  const characterSrc = equippedCharacterSet ?? characterImageSource;

  const healthPercent = (currentHealth / maxHealth) * 100;
  const energyPercent = (currentEnergy / maxEnergy) * 100;

  // Modal cell size — square, most of the screen width
  const CELL = SCREEN_W * 0.72;

  return (
    <View style={styles.container}>
      {/* 1. Background Image */}
      <Image source={backgroundImageSource} style={styles.backgroundImage} />

      {/* 2. Character Stats Card Area */}
      <View style={styles.card}>
        {/* 3. Character Image + Equipment Overlays — tappable to open modal */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
          style={styles.characterTouchable}
        >
          {/* Two-tone room background: lighter wall on top, darker floor on bottom */}
          <View style={styles.characterBg}>
            <View style={[styles.characterBgWall, { backgroundColor: characterBgColors.wall }]} />
            <View style={[styles.characterBgFloor, { backgroundColor: characterBgColors.floor }]} />
          </View>
          {/* Pixelated ground shadow — stacked rectangles, wide to narrow */}
          <View style={[styles.characterShadowPx, { width: 80, bottom: 2, left: 32 }]} />
          <View style={[styles.characterShadowPx, { width: 64, bottom: 6, left: 40 }]} />
          <View style={[styles.characterShadowPx, { width: 48, bottom: 10, left: 48 }]} />
          <Image source={characterSrc} style={styles.characterImage} />
          {equippedOverlays.map((src, i) => (
            <Image key={i} source={src} style={[styles.characterImage, styles.equipmentOverlay]} />
          ))}
        </TouchableOpacity>

        {/* Animal Companion — tappable, sits on the background */}
        {animalCompanion && (
          <TouchableOpacity
            onPress={handleAnimalTap}
            activeOpacity={petTappedToday ? 1 : 0.8}
            style={styles.animalCompanion}
          >
            <Animated.Image
              source={animalCompanion}
              style={[styles.animalCompanionImage, { transform: [{ translateY: jumpAnim }] }]}
              resizeMode="contain"
            />
            {petName && <Text style={styles.petNameText}>{petName}</Text>}
            {showBonus && (
              <Animated.Text style={[styles.bonusText, { transform: [{ translateY: floatY }], opacity: floatOpacity }]}>
                +1
              </Animated.Text>
            )}
          </TouchableOpacity>
        )}

        {/* Hand Items — right side of character, mid-height */}
        {handItems.map((src, i) => (
          <Image key={`hand-${i}`} source={src} style={[styles.handItem, { top: 55 + i * 30 }]} resizeMode="contain" />
        ))}

        {/* Wall Decorations — upper-right inside character box */}
        {wallItems.map((src, i) => (
          <Image key={`wall-${i}`} source={src} style={[styles.wallItem, { left: 65 - i * 33 }]} resizeMode="contain" />
        ))}

        {/* Floor Decorations — lower-right inside character box */}
        {floorItems.map((src, i) => (
          <Image key={`floor-${i}`} source={src} style={[styles.floorItem, { left: 65 - i * 36 }]} resizeMode="contain" />
        ))}

        {/* ── Character Detail Modal ─────────────────────────────────────── */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalCard]} onStartShouldSetResponder={() => true}>
              {/* Background scene */}
              <View style={[styles.modalCell, { width: CELL, height: CELL }]}>
                <Image source={backgroundImageSource} style={styles.modalBackground} />

                {/* Floor items */}
                {floorItems.map((src, i) => (
                  <Image key={`mfloor-${i}`} source={src} style={[styles.modalFloorItem, { right: 12 + i * 48 }]} resizeMode="contain" />
                ))}

                {/* Character + overlays */}
                <Image source={characterSrc} style={styles.modalCharacter} />
                {equippedOverlays.map((src, i) => (
                  <Image key={`mo-${i}`} source={src} style={[styles.modalCharacter, { backgroundColor: "transparent" }]} />
                ))}

                {/* Hand items */}
                {handItems.map((src, i) => (
                  <Image key={`mhand-${i}`} source={src} style={[styles.modalHandItem, { bottom: CELL * 0.28 + i * 40 }]} resizeMode="contain" />
                ))}

                {/* Animal companion */}
                {animalCompanion && (
                  <Image source={animalCompanion} style={styles.modalAnimal} resizeMode="contain" />
                )}

                {/* Level badge */}
                <View style={styles.modalLevelBadge}>
                  <Text style={styles.modalLevelText}>Lv. {level}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 4. Stats Bars Container */}
        <View style={styles.statsContainer}>
          {/* Health Bar (Red) */}
          <View style={styles.barWrapper}>
            <View style={[styles.barBackground, { height: 35, backgroundColor: "rgba(197, 197, 197, 0.5)" }]}>
              <View style={[styles.healthBar, { width: `${healthPercent}%` }]} />
            </View>
            <Text style={styles.statLabel}>Health: {currentHealth}/{maxHealth}</Text>
          </View>

          {/* Energy Bar (Gold/Yellow) */}
          <View style={[styles.barWrapper, { marginTop: 10 }]}>
            <View style={[styles.barBackground, { height: 25 }]}>
              <View style={[styles.energyBar, { width: `${energyPercent}%` }]} />
            </View>
            <Text style={styles.statLabel}>Energeia: {currentEnergy}/{maxEnergy}</Text>
          </View>

          {/* Level Display */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv. {level}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Match the natural aspect ratio of the 1170×786 header images so the full
// artwork is visible without cropping, regardless of screen width.
const CARD_HEIGHT = Math.round(SCREEN_W * (786 / 1170));

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: CARD_HEIGHT,
    overflow: "visible", // Important for layered elements
  },
  backgroundImage: {
    width: "100%",
    height: CARD_HEIGHT,
    resizeMode: "contain",
    position: "absolute",
    top: 0,
    left: 0,
  },
  card: {
    position: "absolute",
    top: 25,
    left: 25,
    right: 25,
    height: CARD_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 10,
    overflow: "visible",
  },
  characterBg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 144,
    height: 144,
    borderRadius: 8,
    overflow: "hidden",
  },
  characterBgWall: {
    flex: 0.72,
  },
  characterBgFloor: {
    flex: 0.28,
  },
  characterImage: {
    width: 144,
    height: 144,
    backgroundColor: "transparent",
    borderRadius: 8,
    marginRight: 10,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 20,
  },
  equipmentOverlay: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    zIndex: 21,
  },
  statsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -3,
    height: 130,
    justifyContent: "space-between",
    paddingVertical: 5,
    zIndex: 10,
  },
  statIcon: {
    width: 30, // Make the icons slightly larger for visibility
    height: 30,
    marginRight: 8, // Space between icon and bar
    resizeMode: "contain",
    // Remove all previous absolute positioning styles related to icons
  },
  statRow: {
    flexDirection: "row", // Align icon and bar horizontally
    alignItems: "center", // Center them vertically within the row
    marginBottom: 10, // Space between health row and energy row
  },
  barWrapper: {
    flex: 1,
  },
  barBackground: {
    position: "relative", // Keep relative for progress fill
    // height is defined inline in the component
    width: "100%", // Fill the barWrapper width
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#666",
  },
  healthBar: {
    height: "100%",
    backgroundColor: "#C81E32", // Red color for health
  },
  energyBar: {
    height: "100%",
    backgroundColor: "#FFD700", // Gold/Yellow color for energy
  },
  healthIconAbsolute: {
    width: 25,
    height: 25,
    position: "absolute",
    left: 5, // Slight padding from the left edge of the bar
    top: 5, // Centers the 25px icon within the 35px bar (35-25)/2 = 5
    zIndex: 10, // Ensure it's on top of the progress bar fill
  },
  energyIconAbsolute: {
    width: 20,
    height: 20,
    position: "absolute",
    left: 5, // Slight padding from the left edge of the bar
    top: 2.5, // Centers the 20px icon within the 25px bar (25-20)/2 = 2.5
    zIndex: 10,
  },
  heartIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    //tintColor: "#950000", // Deep red for the heart icon
  },
  boltIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
    //tintColor: "#EEDD82", // Light gold for the bolt icon
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#fff",
  },
  animalCompanion: {
    position: "absolute",
    left: 140,
    bottom: 30,
    zIndex: 22,
    alignItems: "center",
  },
  animalCompanionImage: {
    width: 67,
    height: 67,
  },
  petNameText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: -8,
  },
  bonusText: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  wallItem: {
    position: "absolute",
    top: 5,
    width: 28,
    height: 28,
    zIndex: 25,
  },
  floorItem: {
    position: "absolute",
    top: 65,
    width: 32,
    height: 32,
    zIndex: 25,
  },
  handItem: {
    position: "absolute",
    left: 68,
    width: 32,
    height: 32,
    zIndex: 23,
  },
  characterTouchable: {
    position: "absolute",
    left: 0,
    top: 115,
    width: 144,
    height: 144,
    zIndex: 20,
  },
  characterShadowPx: {
    position: "absolute",
    height: 4,
    backgroundColor: "rgba(0,0,0,0.30)",
    zIndex: 2,
  },

  // ── Character detail modal ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    alignItems: "center",
    gap: 16,
  },
  modalCell: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modalCharacter: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
  modalWallItem: {
    position: "absolute",
    top: 12,
    width: 52,
    height: 52,
  },
  modalFloorItem: {
    position: "absolute",
    bottom: 12,
    width: 58,
    height: 58,
  },
  modalHandItem: {
    position: "absolute",
    right: "35%",
    width: 60,
    height: 60,
  },
  modalAnimal: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 72,
    height: 72,
  },
  modalLevelBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalLevelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  modalCloseButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 11,
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default CharacterStats;
