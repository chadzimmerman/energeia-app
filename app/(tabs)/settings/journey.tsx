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

interface ClassQuest {
  id: number;
  title: string;
  intro_text: string;
  completion_text: string;
  part_number: number;
  required_items_count: number;
  required_item_name: string;
  quest_image: string | null;
  quest_type: string | null;
  boss_difficulty: number | null;
}

const CLASS_LABELS: Record<string, string> = {
  monk: "Monk",
  fighter: "Fighter",
  princess: "Princess",
  nobleman: "Noble",
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  monk:     "The path of theosis — through silence, fasting, and noetic warfare.",
  fighter:  "The way of the warrior — discipline, courage, and righteous battle.",
  princess: "The crown of humility — service, generosity, and ancient wisdom.",
  nobleman: "The burden of the throne — just rule, stewardship, and righteous sovereignty.",
};

const ProgressBar = ({ progress, color = "#2ECC71" }: { progress: number; color?: string }) => (
  <View style={{ height: 10, width: "100%", backgroundColor: "#E0E0E0", borderRadius: 5, overflow: "hidden" }}>
    <View style={{ height: "100%", width: `${Math.min(Math.max(progress * 100, 0), 100)}%`, backgroundColor: color }} />
  </View>
);

export default function JourneyScreen() {
  const [quests, setQuests] = useState<ClassQuest[]>([]);
  const [userProgress, setUserProgress] = useState<Record<number, any>>({});
  const [userClass, setUserClass] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJourneyData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get user's class
    const { data: profile } = await supabase
      .from("profiles")
      .select("player_class")
      .eq("id", session.user.id)
      .single();

    const playerClass = profile?.player_class ?? null;
    setUserClass(playerClass);

    if (!playerClass) {
      setLoading(false);
      return;
    }

    // Fetch this class's quest line
    const { data: questData } = await supabase
      .from("seasonal_stories")
      .select("*")
      .eq("quest_line_type", "class")
      .eq("class_key", playerClass)
      .eq("is_active", true)
      .order("part_number", { ascending: true });

    // Fetch user progress for these quests
    const questIds = (questData ?? []).map((q) => q.id);
    const { data: progressData } = await supabase
      .from("user_story_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .in("story_id", questIds.length > 0 ? questIds : [-1]);

    const progressMap: Record<number, any> = {};
    progressData?.forEach((p) => { progressMap[p.story_id] = p; });

    // Auto-init: if user has no progress on Part 1, start it
    if (questData && questData.length > 0) {
      const hasAnyProgress = progressData && progressData.length > 0;
      if (!hasAnyProgress) {
        const { data: newProgress } = await supabase
          .from("user_story_progress")
          .insert([{ user_id: session.user.id, story_id: questData[0].id, current_count: 0 }])
          .select()
          .single();
        if (newProgress) progressMap[questData[0].id] = newProgress;
      }
    }

    setQuests(questData ?? []);
    setUserProgress(progressMap);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadJourneyData(); }, [loadJourneyData]));

  const handleTogglePause = async (questId: number) => {
    const current = userProgress[questId];
    if (!current) return;
    const newPause = !current.is_paused;
    const { error } = await supabase
      .from("user_story_progress")
      .update({ is_paused: newPause })
      .eq("id", current.id);
    if (!error) {
      setUserProgress((prev) => ({ ...prev, [questId]: { ...current, is_paused: newPause } }));
    }
  };

  if (loading) return <View style={styles.container}><Text>Loading your journey...</Text></View>;

  if (!userClass) return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>You haven't chosen a class yet. Visit the character screen to begin your journey.</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Class header */}
      <View style={styles.classHeader}>
        <Text style={styles.classTitle}>{CLASS_LABELS[userClass] ?? userClass} Quest Line</Text>
        <Text style={styles.classDescription}>{CLASS_DESCRIPTIONS[userClass] ?? ""}</Text>
      </View>

      {quests.map((quest, index) => {
        const progressObj = userProgress[quest.id];
        const rawCount = progressObj?.current_count ?? 0;
        const displayCount = Math.min(rawCount, quest.required_items_count);
        const isCompleted = progressObj?.is_completed === true;
        const isLocked = index > 0 && !userProgress[quests[index - 1].id]?.is_completed;
        const isFightQuest = quest.quest_type === "fight";

        const progressRatio = isCompleted
          ? 1
          : quest.required_items_count > 0
            ? rawCount / quest.required_items_count
            : 0;

        return (
          <View key={quest.id} style={[styles.node, isLocked && styles.lockedNode]}>
            {isLocked && (
              <View style={styles.lockOverlay}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            )}
            <TouchableOpacity
              disabled={isLocked}
              onPress={() => setExpandedId(expandedId === quest.id ? null : quest.id)}
            >
              <View style={styles.row}>
                <Image
                  source={
                    quest.quest_image
                      ? { uri: quest.quest_image }
                      : require("../../../assets/sprites/quests/quest-placeholder.png")
                  }
                  style={styles.thumb}
                />
                <View style={styles.textContainer}>
                  <Text style={styles.nodeTitle}>{quest.title}</Text>
                  <Text style={styles.subtext}>
                    {isLocked
                      ? "??? (Locked)"
                      : isCompleted
                        ? "✅ Complete!"
                        : isFightQuest
                          ? `⚔️ ${displayCount}/${quest.required_items_count} HP dealt`
                          : `${displayCount}/${quest.required_items_count} ${quest.required_item_name}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {!isLocked && (
              <View style={styles.progressSection}>
                <ProgressBar
                  progress={progressRatio}
                  color={isCompleted ? "#3498DB" : isFightQuest ? "#E74C3C" : "#2ECC71"}
                />
              </View>
            )}

            {expandedId === quest.id && (
              <View style={styles.descriptionBox}>
                <Text style={styles.storyText}>
                  {isCompleted ? quest.completion_text : quest.intro_text}
                </Text>
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Text style={{ color: "white", fontWeight: "bold" }}>Quest Complete!</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.pauseButton, progressObj?.is_paused && styles.pausedActive]}
                    onPress={() => handleTogglePause(quest.id)}
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

      {quests.length === 0 && (
        <Text style={styles.emptyText}>No class quests found. Please contact support.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f5f5" },
  classHeader: {
    backgroundColor: "#4A3728",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  classTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F5DEB3",
    marginBottom: 6,
  },
  classDescription: {
    fontSize: 13,
    color: "#C8A97E",
    lineHeight: 18,
    fontStyle: "italic",
  },
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
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderRadius: 12,
  },
  lockIcon: { fontSize: 24, opacity: 0.6 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 14, lineHeight: 20 },
});
