import { supabase } from "@/utils/supabase";
import React, { useEffect, useState } from "react";
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
  part_number: number;
  required_items_count: number;
  required_item_name: string;
  quest_image: string | null;
  // ... any other columns from your table
}

// A simple, cross-platform custom progress bar
const ProgressBar = ({ progress }: { progress: number }) => (
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
        backgroundColor: "#2ECC71",
      }}
    />
  </View>
);

// determine season
const getCurrentSeasonString = () => {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec

  if (month >= 11 || month <= 1) return "Winter (Dec–Feb)";
  if (month >= 2 && month <= 4) return "Spring (Mar–May)";
  if (month >= 5 && month <= 7) return "Summer (Jun–Aug)"; // Assuming future format
  return "Autumn (Sep–Nov)"; // Assuming future format
};

export default function StorylineScreen() {
  const [stories, setStories] = useState<SeasonalStory[]>([]);
  const [userProgress, setUserProgress] = useState<Record<number, any>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoryData = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const currentSeason = getCurrentSeasonString(); // Get "Winter (Dec–Feb)"

    // 1. Fetch Stories ONLY for this season
    const { data: storyData, error: storyError } = await supabase // 👈 Added error: storyError
      .from("seasonal_stories")
      .select("*")
      .eq("season", currentSeason)
      .eq("is_active", true)
      .order("part_number", { ascending: true });

    console.log("Stories found:", storyData?.length);
    if (storyError) console.error("Supabase Story Error:", storyError.message);

    // 2. Fetch Progress
    const { data: progressData } = await supabase
      .from("user_story_progress")
      .select("*")
      .eq("user_id", session.user.id);

    const progressMap = {};
    progressData?.forEach((p) => {
      progressMap[p.story_id] = p;
    });

    // 3. AUTO-INITIALIZE: If user has stories but NO progress at all, start Part 1
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
  };

  useEffect(() => {
    loadStoryData();
  }, []);

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
        const currentCount = progressObj?.current_count || 0;

        // A node is locked if it's not the first one AND the previous one isn't finished
        // We use optional chaining ?. to handle the case where the previous progress doesn't exist
        const isLocked =
          index > 0 && !userProgress[stories[index - 1].id]?.is_completed;

        const progressRatio =
          story.required_items_count > 0
            ? currentCount / story.required_items_count
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
                      : `${currentCount}/${story.required_items_count} ${story.required_item_name}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {!isLocked && (
              <View style={styles.progressSection}>
                <ProgressBar progress={progressRatio} />
              </View>
            )}

            {expandedId === story.id && (
              <View style={styles.descriptionBox}>
                <Text style={styles.storyText}>{story.intro_text}</Text>
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
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// Basic styles to get you started
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
