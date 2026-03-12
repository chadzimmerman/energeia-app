import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SeasonalStory {
  id: number;
  title: string;
  intro_text: string;
  completion_text: string;
  part_number: number;
  required_items_count: number;
  required_item_name: string;
  quest_image: string | null;
  quest_type: string | null;       // "fight" | "collection" | null
  boss_difficulty: number | null;
}

// A simple, cross-platform custom progress bar
// color defaults to green for collection quests; pass red for fight/boss quests
const ProgressBar = ({ progress, color = "#2ECC71" }: { progress: number; color?: string }) => (
  <View
    style={{
      height: 10,
      width: "100%",
      backgroundColor: "#E0E0E0",
      borderRadius: 5,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        height: "100%",
        width: `${Math.min(Math.max(progress * 100, 0), 100)}%`,
        backgroundColor: color,
      }}
    />
  </View>
);

// determine season
const getCurrentSeasonString = () => {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec

  if (month >= 11 || month <= 1) return "Winter (Dec–Feb)";
  if (month >= 2 && month <= 4) return "Spring (Mar–May)";
  if (month >= 5 && month <= 7) return "Summer (Jun–Aug)";
  return "Autumn (Sep–Nov)";
};

export default function StorylineScreen() {
  const [stories, setStories] = useState<SeasonalStory[]>([]);
  const [userProgress, setUserProgress] = useState<Record<number, any>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoryData = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const currentSeason = getCurrentSeasonString();

    const { data: storyData, error: storyError } = await supabase
      .from("seasonal_stories")
      .select("*")
      .eq("season", currentSeason)
      .eq("is_active", true)
      .order("part_number", { ascending: true });

    if (storyError) console.error("Supabase Story Error:", storyError.message);

    const { data: progressData } = await supabase
      .from("user_story_progress")
      .select("*")
      .eq("user_id", session.user.id);

    const progressMap: Record<number, any> = {};
    progressData?.forEach((p) => {
      progressMap[p.story_id] = p;
    });

    // AUTO-INITIALIZE: If user has stories but NO progress at all, start Part 1
    if (
      storyData &&
      storyData.length > 0 &&
      (!progressData || progressData.length === 0)
    ) {
      const firstStoryId = storyData[0].id;
      const { data: newProgress } = await supabase
        .from("user_story_progress")
        .insert([
          {
            user_id: session.user.id,
            story_id: firstStoryId,
            current_count: 0,
          },
        ])
        .select()
        .single();

      if (newProgress) progressMap[firstStoryId] = newProgress;
    }

    setStories(storyData || []);
    setUserProgress(progressMap);
    setLoading(false);
  }, []);

  // Reload every time the screen comes into focus so damage/drops show immediately
  useFocusEffect(
    useCallback(() => {
      loadStoryData();
    }, [loadStoryData]),
  );

  const handleTogglePause = async (storyId: number) => {
    const currentProgress = userProgress[storyId];
    if (!currentProgress) return;

    const newPauseStatus = !currentProgress.is_paused;
    const { error } = await supabase
      .from("user_story_progress")
      .update({ is_paused: newPauseStatus })
      .eq("id", currentProgress.id);

    if (!error) {
      setUserProgress((prev) => ({
        ...prev,
        [storyId]: { ...currentProgress, is_paused: newPauseStatus },
      }));
    }
  };

  if (loading)
    return (
      <View style={styles.container}>
        <Text>Reading the scrolls...</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      {stories.map((story, index) => {
        const progressObj = userProgress[story.id];
        // Cap display count at goal so it never shows 44/40
        const rawCount = progressObj?.current_count ?? 0;
        const displayCount = Math.min(rawCount, story.required_items_count);
        const isCompleted = progressObj?.is_completed === true;

        const isLocked =
          index > 0 && !userProgress[stories[index - 1].id]?.is_completed;

        const isFightQuest = story.quest_type === "fight";

        // Completed quests always show a full bar
        const progressRatio = isCompleted
          ? 1
          : story.required_items_count > 0
            ? rawCount / story.required_items_count
            : 0;

        return (
          <View
            key={story.id}
            style={[styles.node, isLocked && styles.lockedNode]}
          >
            {isLocked && (
              <View style={styles.lockOverlay}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            )}
            <TouchableOpacity
              disabled={isLocked}
              onPress={() =>
                setExpandedId(expandedId === story.id ? null : story.id)
              }
            >
              <View style={styles.row}>
                <Image
                  source={
                    story.quest_image
                      ? { uri: story.quest_image }
                      : require("../../../assets/sprites/quests/quest-placeholder.png")
                  }
                  style={styles.thumb}
                />
                <View style={styles.textContainer}>
                  <Text style={styles.nodeTitle}>{story.title}</Text>
                  <Text style={styles.subtext}>
                    {isLocked
                      ? "??? (Locked)"
                      : isCompleted
                        ? "✅ Complete!"
                        : isFightQuest
                          ? `⚔️ ${displayCount}/${story.required_items_count} HP dealt`
                          : `${displayCount}/${story.required_items_count} ${story.required_item_name}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {!isLocked && (
              <View style={styles.progressSection}>
                <ProgressBar
                  progress={progressRatio}
                  color={
                    isCompleted ? "#3498DB" : isFightQuest ? "#E74C3C" : "#2ECC71"
                  }
                />
              </View>
            )}

            {expandedId === story.id && (
              <View style={styles.descriptionBox}>
                <Text style={styles.storyText}>
                  {isCompleted ? story.completion_text : story.intro_text}
                </Text>
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Quest Complete!
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.pauseButton,
                      progressObj?.is_paused && styles.pausedActive,
                    ]}
                    onPress={() => handleTogglePause(story.id)}
                  >
                    <Text style={{ color: "white" }}>
                      {progressObj?.is_paused ? "Resume Quest" : "Pause Quest"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f5f5" },
  node: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  lockedNode: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  textContainer: { flex: 1 },
  nodeTitle: { fontSize: 18, fontWeight: "bold" },
  subtext: { color: "#666" },
  progressSection: { marginTop: 15 },
  descriptionBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  storyText: { fontSize: 14, color: "#444", lineHeight: 20 },
  pauseButton: {
    marginTop: 10,
    backgroundColor: "#E67E22",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  pausedActive: { backgroundColor: "#2ECC71" },
  completedBadge: {
    marginTop: 10,
    backgroundColor: "#3498DB",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
});
