import { supabase } from "@/utils/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ── Local animal image map ────────────────────────────────────────────────────
// Metro requires static require() paths — add new animals here as art is added.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ANIMAL_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  puppy:           require("../../../assets/sprites/animals/puppy.png"),
  kitten:          require("../../../assets/sprites/animals/kitten.png"),
  "baby-rabbit":   require("../../../assets/sprites/animals/baby-rabbit.png"),
  "baby-bear":     require("../../../assets/sprites/animals/baby-bear.png"),
  "baby-crocodile":require("../../../assets/sprites/animals/baby-crocodile.png"),
  bear:            require("../../../assets/sprites/animals/bear.png"),
  "baby-lion":     require("../../../assets/sprites/animals/baby-lion.png"),
};

const resolveAnimalImage = (key: string): ImageSourcePropType => {
  if (key.startsWith("http")) return { uri: key };
  return ANIMAL_IMAGE_MAP[key] ?? ANIMAL_IMAGE_MAP["puppy"];
};

// ── Season helper ─────────────────────────────────────────────────────────────

const getCurrentSeason = (): string => {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface StableAnimal {
  id: string;
  name: string;
  imageSource: ImageSourcePropType;
  price: number;
  flavorText: string;
  description: string;
  isSeasonal: boolean;
  season: string | null;
  isSubscriberOnly: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const screenWidth = Dimensions.get("window").width;
const CARD_PADDING = 15;
const CARD_GAP = 10;
const cardSize = (screenWidth - CARD_PADDING * 2 - CARD_GAP) / 2;

// ── Animal Card ───────────────────────────────────────────────────────────────

const AnimalCard: React.FC<{
  animal: StableAnimal;
  onPress: (animal: StableAnimal) => void;
}> = ({ animal, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { width: cardSize, height: cardSize * 1.4 }]}
    onPress={() => onPress(animal)}
    activeOpacity={0.75}
  >
    <Image
      source={animal.imageSource}
      style={styles.cardImage}
      resizeMode="contain"
    />
    <Text style={styles.cardName} numberOfLines={2}>{animal.name}</Text>
    {animal.isSeasonal && (
      <View style={styles.seasonBadge}>
        <Text style={styles.seasonBadgeText}>{animal.season ?? "Seasonal"}</Text>
      </View>
    )}
    {animal.isSubscriberOnly && (
      <View style={styles.subscriberBadge}>
        <FontAwesome name="star" size={9} color="#fff" />
        <Text style={styles.subscriberBadgeText}>SUB</Text>
      </View>
    )}
    <View style={styles.priceRow}>
      <FontAwesome name="flash" size={12} color="#A06E00" />
      <Text style={styles.priceText}>{animal.price}</Text>
    </View>
  </TouchableOpacity>
);

// ── Purchase Modal ────────────────────────────────────────────────────────────

const AnimalModal: React.FC<{
  visible: boolean;
  animal: StableAnimal | null;
  playerEnergeia: number;
  userId: string | null;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}> = ({ visible, animal, playerEnergeia, userId, onClose, onPurchaseSuccess }) => {
  if (!animal) return null;

  const canAfford = playerEnergeia >= animal.price;
  const isLocked = animal.isSubscriberOnly;

  const handleBuy = async () => {
    try {
      const { error: invError } = await supabase
        .from("user_inventory")
        .insert({ user_id: userId, item_master_id: animal.id });

      if (invError) throw invError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ energeia_currency: playerEnergeia - animal.price })
        .eq("id", userId);

      if (profileError) throw profileError;

      onPurchaseSuccess();
      onClose();
      Alert.alert("Welcome Home!", `${animal.name} has joined your stable.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={modal.card} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
            <FontAwesome name="times" size={22} color="#888" />
          </TouchableOpacity>

          <View style={modal.currencyChip}>
            <FontAwesome name="flash" size={14} color="#FFC800" />
            <Text style={modal.currencyText}>{playerEnergeia}</Text>
          </View>

          <Image
            source={animal.imageSource}
            style={modal.image}
            resizeMode="contain"
          />

          <Text style={modal.name}>{animal.name}</Text>
          <Text style={modal.flavor}>{animal.flavorText}</Text>
          <Text style={modal.desc}>{animal.description}</Text>

          <TouchableOpacity
            style={[modal.buyBtn, isLocked ? modal.subscriberBtn : !canAfford && modal.disabledBtn]}
            onPress={handleBuy}
            disabled={isLocked || !canAfford}
          >
            {isLocked ? (
              <>
                <FontAwesome name="star" size={15} color="#fff" />
                <Text style={modal.buyText}>SUBSCRIBERS ONLY</Text>
              </>
            ) : (
              <>
                <Text style={modal.buyText}>{canAfford ? "ADOPT" : "CANNOT AFFORD"}</Text>
                <View style={modal.priceTag}>
                  <FontAwesome name="flash" size={13} color="#A06E00" />
                  <Text style={modal.priceTagText}>{animal.price}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function StableScreen() {
  const [animals, setAnimals] = useState<StableAnimal[]>([]);
  const [playerEnergeia, setPlayerEnergeia] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StableAnimal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStableData = useCallback(async (uid: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("energeia_currency")
        .eq("id", uid)
        .single();

      if (profile) setPlayerEnergeia(profile.energeia_currency);

      // Fetch all animals from items_master
      const { data: items, error } = await supabase
        .from("items_master")
        .select("*")
        .eq("type", "animal");

      if (error) throw error;

      // Filter out unique animals already owned
      const { data: inventory } = await supabase
        .from("user_inventory")
        .select("item_master_id")
        .eq("user_id", uid);

      const ownedIds = inventory?.map((i) => i.item_master_id) ?? [];

      const currentSeason = getCurrentSeason();

      const available = (items ?? [])
        .filter((item) => {
          if (item.is_unique && ownedIds.includes(item.id)) return false;
          // Subscriber-only items always show so users can see what they're missing
          if (item.is_subscriber_only) return true;
          // Hide seasonal animals that aren't in the current season
          if (!item.is_permanent && item.season) {
            return item.season.startsWith(currentSeason);
          }
          return true;
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          imageSource: resolveAnimalImage(item.image_path ?? ""),
          price: item.base_energeia_cost,
          flavorText: item.flavor_text,
          description: item.description,
          isSeasonal: !item.is_permanent,
          season: item.season ?? null,
          isSubscriberOnly: item.is_subscriber_only ?? false,
        }));

      setAnimals(available);
    } catch (e: any) {
      console.error("Stable load error:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          fetchStableData(session.user.id);
        }
      };
      load();
    }, [fetchStableData]),
  );

  const regular  = animals.filter((a) => !a.isSeasonal);
  const seasonal = animals.filter((a) => a.isSeasonal);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {/* Header image with currency overlay */}
      <View style={styles.headerImageContainer}>
        <Image
          source={require("../../../assets/sprites/ui-elements/stable-cover.png")}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.currencyOverlay}>
          <View style={styles.currencyChip}>
            <FontAwesome name="flash" size={16} color="#FFC800" />
            <Text style={styles.currencyText}>{playerEnergeia}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.innkeeperText}>
          "Care for your animals as you care for your soul — with patience and
          devotion."
        </Text>

        {/* Regular Animals */}
        <Text style={styles.sectionTitle}>Animals</Text>
        {regular.length === 0 ? (
          <Text style={styles.emptyText}>
            No animals available yet. Check back soon.
          </Text>
        ) : (
          <View style={styles.grid}>
            {regular.map((a) => (
              <AnimalCard key={a.id} animal={a} onPress={setSelected} />
            ))}
          </View>
        )}

        {/* Seasonal Animals */}
        <Text style={styles.sectionTitle}>Seasonal Companions</Text>
        {seasonal.length === 0 ? (
          <Text style={styles.emptyText}>
            No seasonal companions available right now.
          </Text>
        ) : (
          <View style={styles.grid}>
            {seasonal.map((a) => (
              <AnimalCard key={a.id} animal={a} onPress={setSelected} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AnimalModal
        visible={!!selected}
        animal={selected}
        playerEnergeia={playerEnergeia}
        userId={userId}
        onClose={() => setSelected(null)}
        onPurchaseSuccess={() => {
          if (userId) fetchStableData(userId);
        }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F0" },
  headerImageContainer: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    position: "relative",
    borderBottomWidth: 3,
    borderBottomColor: "#5D4037",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  currencyOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FFC800",
    gap: 5,
  },
  currencyText: { color: "#333", fontWeight: "bold", fontSize: 15 },
  scroll: { paddingBottom: 20 },
  innkeeperText: {
    fontSize: 14,
    color: "#5D4037",
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#FBE8B5",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FBD28B",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: CARD_PADDING,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAAAAA",
    fontStyle: "italic",
    paddingHorizontal: CARD_PADDING,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: CARD_PADDING,
    rowGap: CARD_GAP * 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  cardImage: { width: "65%", height: "50%", marginBottom: 4 },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 6,
    height: 34,
  },
  seasonBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#9370DB",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  seasonBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  subscriberBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#B8860B",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  subscriberBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBE8B5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FBD28B",
    gap: 4,
  },
  priceText: { fontSize: 14, fontWeight: "bold", color: "#A06E00" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    position: "relative",
  },
  closeBtn: { position: "absolute", top: 10, left: 10, padding: 8 },
  currencyChip: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  currencyText: { fontWeight: "600", color: "#333", fontSize: 14 },
  image: { width: 110, height: 110, marginTop: 20, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 4 },
  flavor: { fontSize: 13, color: "#9370DB", fontStyle: "italic", textAlign: "center", marginBottom: 8 },
  desc: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 12 },
  buyBtn: {
    backgroundColor: "#5D4037",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  disabledBtn: { backgroundColor: "#E74C3C", opacity: 0.8 },
  subscriberBtn: { backgroundColor: "#B8860B" },
  buyText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  priceTagText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
