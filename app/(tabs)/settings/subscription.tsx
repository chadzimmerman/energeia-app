import { supabase } from "@/utils/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SubscriptionProfile {
  is_subscriber: boolean;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
}

const BENEFITS = [
  {
    id: "guide",
    text: "AI Spiritual Guide — personalized reflection from a wise elder",
  },
  {
    id: "items",
    text: "Exclusive subscriber-only seasonal items",
  },
  {
    id: "achievement",
    text: "Philanthropist achievement badge",
  },
  {
    id: "support",
    text: "Priority support for feedback and bug reports",
  },
  {
    id: "future",
    text: "Early access to all future premium features",
  },
];

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// --- SUBSCRIBER VIEW ---
function SubscriberView({ profile }: { profile: SubscriptionProfile }) {
  return (
    <ScrollView
      style={subStyles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Purple banner */}
      <View style={subStyles.banner}>
        <FontAwesome
          name="star"
          size={32}
          color="#FFC800"
          style={{ marginBottom: 8 }}
        />
        <Text style={subStyles.bannerTitle}>Active Subscriber</Text>
        <Text style={subStyles.bannerSubtitle}>
          Thank you for supporting Energe.ia
        </Text>
      </View>

      {/* Status rows */}
      <View style={subStyles.sectionContainer}>
        <View style={subStyles.list}>
          <View style={[subStyles.row, subStyles.separator]}>
            <Text style={subStyles.rowLabel}>Status</Text>
            <Text style={[subStyles.rowValue, subStyles.activeText]}>
              Active
            </Text>
          </View>
          <View style={[subStyles.row, subStyles.separator]}>
            <Text style={subStyles.rowLabel}>Member Since</Text>
            <Text style={subStyles.rowValue}>
              {formatDate(profile.subscription_started_at)}
            </Text>
          </View>
          <View style={subStyles.row}>
            <Text style={subStyles.rowLabel}>Renews</Text>
            <Text style={subStyles.rowValue}>
              {formatDate(profile.subscription_expires_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* Benefits */}
      <View style={subStyles.sectionContainer}>
        <Text style={subStyles.sectionTitle}>Your Benefits</Text>
        <View style={subStyles.list}>
          {BENEFITS.map((benefit, index) => (
            <View
              key={benefit.id}
              style={[
                subStyles.benefitRow,
                index < BENEFITS.length - 1 && subStyles.separator,
              ]}
            >
              <FontAwesome
                name="check"
                size={14}
                color="#A737FD"
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <Text style={subStyles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Management note */}
      <View style={subStyles.sectionContainer}>
        <View style={subStyles.list}>
          <View style={subStyles.row}>
            <Text style={subStyles.managementNote}>
              To manage or cancel, visit Settings → Apple ID → Subscriptions on
              your device.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// --- UPSELL VIEW (non-subscriber) ---
function UpsellView() {
  return (
    <View style={upsellStyles.backdrop}>
      <View style={upsellStyles.card}>
        {/* Card header */}
        <View style={upsellStyles.cardHeader}>
          <FontAwesome
            name="star"
            size={30}
            color="#FFC800"
            style={{ marginBottom: 8 }}
          />
          <Text style={upsellStyles.cardTitle}>Energe.ia Premium</Text>
          <Text style={upsellStyles.cardSubtitle}>
            Support the monastery. Unlock your full journey.
          </Text>
        </View>

        {/* Benefits list */}
        <View style={upsellStyles.benefitList}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.id} style={upsellStyles.benefitRow}>
              <FontAwesome
                name="check-circle"
                size={16}
                color="#A737FD"
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <Text style={upsellStyles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* Price */}
        <View style={upsellStyles.priceContainer}>
          <Text style={upsellStyles.price}>$2.99</Text>
          <Text style={upsellStyles.pricePeriod}> / month</Text>
        </View>

        {/* Subscribe button */}
        <TouchableOpacity style={upsellStyles.subscribeButton} onPress={() => {}}>
          <Text style={upsellStyles.subscribeButtonText}>Subscribe</Text>
        </TouchableOpacity>

        <Text style={upsellStyles.finePrint}>
          In-app subscription coming soon. Cancel anytime.
        </Text>
      </View>
    </View>
  );
}

// --- MAIN SCREEN ---
export default function SubscriptionScreen() {
  const [profile, setProfile] = useState<SubscriptionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { data, error } = await supabase
            .from("profiles")
            .select(
              "is_subscriber, subscription_expires_at, subscription_started_at"
            )
            .eq("id", session.user.id)
            .single();

          if (error) throw error;
          setProfile(data);
        } catch (e: any) {
          console.error("Subscription fetch error:", e.message);
          setProfile({
            is_subscriber: false,
            subscription_expires_at: null,
            subscription_started_at: null,
          });
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (profile?.is_subscriber) {
    return <SubscriberView profile={profile} />;
  }

  return <UpsellView />;
}

// --- SUBSCRIBER STYLES ---
const subStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  banner: {
    backgroundColor: "#A737FD",
    paddingVertical: 30,
    alignItems: "center",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#A9A9A9",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  list: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCDCDC",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DCDCDC",
  },
  rowLabel: {
    fontSize: 16,
    color: "#000",
  },
  rowValue: {
    fontSize: 15,
    color: "#888",
  },
  activeText: {
    color: "#2ECC71",
    fontWeight: "bold",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  benefitText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  managementNote: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
  },
});

// --- UPSELL STYLES ---
const upsellStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  cardHeader: {
    backgroundColor: "#A737FD",
    paddingVertical: 24,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textAlign: "center",
  },
  benefitList: {
    padding: 20,
    gap: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  benefitText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    lineHeight: 21,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#A737FD",
  },
  pricePeriod: {
    fontSize: 16,
    color: "#888",
  },
  subscribeButton: {
    backgroundColor: "#A737FD",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  finePrint: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
