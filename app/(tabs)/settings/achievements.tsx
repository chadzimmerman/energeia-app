// app/AchievementsScreen.tsx (or wherever you place your pages)

import AchievementItem from "@/components/AchievementItem";
import {
  ALL_ACHIEVEMENTS,
  getAchievementImageSource,
} from "@/data/achievements";
import { supabase } from "@/utils/supabase";
import { useSeason } from "@/contexts/SeasonContext";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


interface SelectedAchievement {
  title: string;
  description: string;
  imageSource: ImageSourcePropType;
}

// Mock interface for the achievement status we'd fetch from the DB
interface UserAchievementStatus {
  achievement_id: string; // Corresponds to AchievementDefinition.id
  is_achieved: boolean; // True/False status
  // Optional: progress_value: number; // For achievements that show progress (e.g., 5/90 pets)
}

export default function AchievementsScreen() {
  const { seasonColor } = useSeason();
  const [loading, setLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState<UserAchievementStatus[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAchievement | null>(null);

  // 1. Initial Auth and Setup (assuming a similar pattern as your index.tsx)
  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  // 2. Fetch User Achievement Statuses
  const fetchUserAchievementStatuses = useCallback(
    async (currentUserId: string) => {
      setLoading(true);
      try {
        // NOTE: You'll need to create a table named 'user_achievements' in Supabase
        // with columns like 'user_id', 'achievement_id', and 'is_achieved'.
        const { data, error } = await supabase
          .from("user_achievements")
          .select("achievement_id, is_achieved")
          .eq("user_id", currentUserId);

        if (error) throw error;

        setUserStatuses(data as UserAchievementStatus[]);
      } catch (e: any) {
        console.error("Error fetching achievement statuses:", e.message);
        // For now, on error, we just show no achievements
        setUserStatuses([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (userId) {
      fetchUserAchievementStatuses(userId);
    }
  }, [userId, fetchUserAchievementStatuses]);

  // 3. Status Lookup and Rendering
  const getIsAchieved = (achievementId: string): boolean => {
    return userStatuses.some(
      (status) => status.achievement_id === achievementId && status.is_achieved
    );
  };

  if (loading || !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContainer}>
        {ALL_ACHIEVEMENTS.map((achievement) => {
          const isAchieved = getIsAchieved(achievement.id);
          const imageSource = getAchievementImageSource(achievement.imageKey, isAchieved);
          return (
            <AchievementItem
              key={achievement.id}
              title={achievement.title}
              description={achievement.description}
              imageSource={imageSource}
              isAchieved={isAchieved}
              onPress={() => setSelected({ title: achievement.title, description: achievement.description, imageSource })}
            />
          );
        })}
      </ScrollView>

      {/* Lightbox modal — only opens for earned achievements */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.lightbox} onStartShouldSetResponder={() => true}>
            <Image source={selected?.imageSource!} style={styles.lightboxImage} resizeMode="contain" />
            <Text style={styles.lightboxTitle}>{selected?.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.lightboxDescription}>{selected?.description}</Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: seasonColor }]} onPress={() => setSelected(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {},
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  lightbox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  lightboxImage: {
    width: 180,
    height: 180,
    marginBottom: 18,
  },
  lightboxTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#eee",
    marginBottom: 12,
  },
  lightboxDescription: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  closeButton: {
    paddingHorizontal: 32,
    paddingVertical: 11,
    borderRadius: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
