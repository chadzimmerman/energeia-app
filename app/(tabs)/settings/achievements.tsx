// app/AchievementsScreen.tsx (or wherever you place your pages)

import AchievementItem from "@/components/AchievementItem";
import {
  ALL_ACHIEVEMENTS,
  getAchievementImageSource,
} from "@/data/achievements";
import { supabase } from "@/utils/supabase";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

// Mock interface for the achievement status we'd fetch from the DB
interface UserAchievementStatus {
  achievement_id: string; // Corresponds to AchievementDefinition.id
  is_achieved: boolean; // True/False status
  // Optional: progress_value: number; // For achievements that show progress (e.g., 5/90 pets)
}

export default function AchievementsScreen() {
  const [loading, setLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState<UserAchievementStatus[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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
      {/* Scrolling List of Achievements */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {ALL_ACHIEVEMENTS.map((achievement) => {
          const isAchieved = getIsAchieved(achievement.id);
          const imageSource = getAchievementImageSource(
            achievement.imageKey,
            isAchieved
          );

          return (
            <AchievementItem
              key={achievement.id}
              title={achievement.title}
              description={achievement.description}
              imageSource={imageSource}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5", // Light background for the screen
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    // No padding needed here as the item component has internal padding
  },
});
