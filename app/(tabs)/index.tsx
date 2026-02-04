import CharacterStats from "@/components/CharacterStats";
import HabitList from "@/components/HabitList";
import { View } from "@/components/Themed";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageSourcePropType,
  StyleSheet,
  Text,
} from "react-native";
import { supabase } from "../../utils/supabase";
import HabitEditModal from "../HabitEditModal";

interface Profile {
  id: string;
  username: string;
  current_health: number;
  max_health: number;
  current_energeia: number;
  max_energeia: number;
  character_image_path: string;
  // ... add other columns as needed
}

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  difficulty: number;
  streak_level: number;
}

// Define the default local image path for comparison
const DEFAULT_IMAGE_PATH =
  "../../assets/sprites/characters/monk/novice-monk-male.png";

// Helper function to resolve the image source correctly
const resolveImageSource = (
  path: string | null | undefined,
): ImageSourcePropType => {
  // 1. If path is null, empty, or contains our default filename
  if (!path || path.includes("novice-monk-male.png")) {
    // 🔥 FIX: Use the literal string inside require()
    return require("../../assets/sprites/characters/monk/novice-monk-male.png");
  }

  // 2. Otherwise, assume it's a remote URL from Supabase
  return { uri: path };
};

//item drop percents for seasonal stories
const checkStoryDrop = async (userId: string) => {
  const DROP_CHANCE = 0.3;

  try {
    const { data: activeProgress, error: fetchError } = await supabase
      .from("user_story_progress")
      .select("*, seasonal_stories!inner(*)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .eq("is_paused", false)
      .single();

    if (fetchError || !activeProgress) return;

    const didDrop = Math.random() < DROP_CHANCE;
    if (!didDrop) return;

    const newCount = activeProgress.current_count + 1;
    const goal = activeProgress.seasonal_stories.required_items_count;
    const isNowFinished = newCount >= goal;

    const { error: updateError } = await supabase
      .from("user_story_progress")
      .update({
        current_count: newCount,
        is_completed: isNowFinished,
        completed_at: isNowFinished ? new Date().toISOString() : null,
      })
      .eq("id", activeProgress.id);

    if (!updateError) {
      const storyData = activeProgress.seasonal_stories;

      // --- NEW LOGIC START ---
      if (isNowFinished) {
        // 1. Reward Energeia
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_energeia, max_energeia")
          .eq("id", userId)
          .single();

        if (profile) {
          const reward = storyData.reward_energeia || 0;
          const newEnergeia = Math.min(
            profile.current_energeia + reward,
            profile.max_energeia,
          );

          await supabase
            .from("profiles")
            .update({ current_energeia: newEnergeia })
            .eq("id", userId);
        }

        // 2. Unlock Next Part (if it exists)
        const { data: nextStory } = await supabase
          .from("seasonal_stories")
          .select("id")
          .eq("season", storyData.season)
          .eq("part_number", storyData.part_number + 1)
          .single();

        if (nextStory) {
          await supabase
            .from("user_story_progress")
            .insert([
              { user_id: userId, story_id: nextStory.id, current_count: 0 },
            ]);
        }

        // Final completion message
        alert(
          `🏆 Quest Part Complete!\nYou earned ${storyData.reward_energeia} Energeia. Check your Storyline tab!`,
        );
      } else {
        // Standard item find message
        alert(
          `✨ You found a ${storyData.required_item_name}! (${newCount}/${goal})`,
        );
      }
      // --- NEW LOGIC END ---
    }
  } catch (e) {
    console.error("Story drop error:", e);
  }
};

export default function HabitScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const fetchProfile = useCallback(async (currentUserId: string) => {
    try {
      let { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        const { data: newProfileData, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: currentUserId,
              username: `Novice-${currentUserId.substring(0, 4)}`,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        profileData = newProfileData;
      } else if (fetchError) {
        throw fetchError;
      }

      if (profileData) {
        setProfile(profileData as Profile);
      }
    } catch (e: any) {
      console.error("Profile Fetch/Create Error:", e.message);
      setError(`Profile Setup Error: ${e.message}`);
    }
  }, []);

  const fetchHabits = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_habits")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHabits(data as Habit[]);
    } catch (e: any) {
      console.error("Habit Fetch Error:", e.message);
      setError(`Habit Fetch Error: ${e.message}`);
    }
  }, []);

  // --- Authentication (Run only once on mount) ---
  useEffect(() => {
    const authenticate = async () => {
      setLoading(true);
      setError(null);

      try {
        let currentUserId: string | null = null;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
          currentUserId = user.id;
        } else {
          const { data, error: signInError } =
            await supabase.auth.signInAnonymously();
          if (signInError) throw signInError;
          currentUserId = data.user?.id || null;
        }

        if (currentUserId) {
          setUserId(currentUserId);
          await fetchProfile(currentUserId);
        } else {
          setError("Authentication failed: No user ID found.");
        }
      } catch (e: any) {
        console.error("Authentication Error:", e.message);
        setError(`Authentication Error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    authenticate();
  }, [fetchProfile]);

  // --- Habit Refresh (Run on Mount AND when the screen comes into focus) ---
  // This is the core fix for auto-refreshing the list after the modal closes.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const runFetch = async () => {
        if (userId && isActive) {
          await fetchHabits(userId);
        }
      };

      runFetch();

      return () => {
        isActive = false;
      };
    }, [userId, fetchHabits]),
  );

  // --- Helper: Calculate Stat Changes based on Difficulty ---
  const calculateStatChanges = (
    difficulty: number,
    direction: "up" | "down",
  ): { healthChange: number; energeiaChange: number } => {
    // Safety check: Clamp difficulty between 1 and 10
    const clampedDifficulty = Math.min(Math.max(difficulty, 1), 10);

    // --- Configuration Constants ---
    const healthDamageMultiplier = 1.5;

    // 1. DETERMINE REWARD MAGNITUDE (Positive Press)
    let rewardMagnitude = 0;

    if (clampedDifficulty <= 5) {
      // Low/Medium Difficulty (D=1 gives 1, D=5 gives 5)
      // Note: Your goal was D=1 -> 0.5. We will use D/2 to get 0.5 at D=1, and 2.5 at D=5.
      // Let's aim closer to 1-to-5 scale for 1-to-5 difficulty, and use decimals.
      rewardMagnitude = clampedDifficulty * 1; // Example: D=5 gives 5.0
    } else {
      // High Difficulty (D=6 to D=10). Ramps up quickly to 15 at D=10.
      // We need a steep ramp from 5 to 15. The ramp height is 10, over 5 steps.
      rewardMagnitude = 5 + (clampedDifficulty - 5) * 2;
    }

    // 2. DETERMINE PENALTY MAGNITUDE (Negative Press)

    // We want the penalty to be MIN(5, linear_scale).
    // Let's scale linearly from 1 to 5.
    // Penalty scales linearly from D=1 (1) to D=5 (5), then is capped at 5.

    // Scaling factor (D=1 gives 1, D=5 gives 5, D=10 gives 5)
    let penaltyMagnitude = clampedDifficulty;

    // Cap the maximum penalty at 5, fulfilling the "max 5" requirement for failure.
    penaltyMagnitude = Math.min(penaltyMagnitude, 5);

    let healthChange = 0;
    let energeiaChange = 0;

    if (direction === "up") {
      // RULE: Plus press always grants Energeia based on REWARD Magnitude.
      energeiaChange = rewardMagnitude;
    } else if (direction === "down") {
      // RULE: Minus press always incurs penalty based on PENALTY Magnitude.

      // Health Penalty (More severe loss than Energeia)
      // Use the capped penalty magnitude
      healthChange = -Math.round(penaltyMagnitude * healthDamageMultiplier);

      // Energeia Penalty
      energeiaChange = -penaltyMagnitude;
    }

    return { healthChange, energeiaChange };
  };

  // SCORE HABIT
  const handleScoreHabit = async (
    habitId: string,
    direction: "up" | "down",
  ) => {
    if (!userId) {
      console.error("Cannot score habit: User ID not available.");
      return;
    }

    try {
      // 1. Fetch Habit Details (for difficulty and type)
      const { data: habitData, error: habitFetchError } = await supabase
        .from("user_habits")
        .select("is_positive, is_negative, streak_level, difficulty")
        .eq("id", habitId)
        .single();

      if (habitFetchError || !habitData)
        throw habitFetchError || new Error("Habit not found.");

      const { is_positive, is_negative, streak_level, difficulty } = habitData;

      // 2. Calculate Streak Update (Reset to Yellow Logic)
      let newStreakLevel = streak_level;

      if (direction === "up") {
        // If we are in the red, a single '+' brings us back to neutral yellow (0)
        if (streak_level < 0) {
          newStreakLevel = 0;
        } else {
          // If already yellow or green, just increment
          newStreakLevel = streak_level + 1;
        }
      } else {
        // direction === "down"
        // If we are in the green, a single '-' resets us to neutral yellow (0)
        if (streak_level > 0) {
          newStreakLevel = 0;
        } else {
          // If already yellow or red, go deeper into red
          newStreakLevel = streak_level - 1;
        }
      }

      // Keep the floor to keep it manageable
      if (newStreakLevel < -3) {
        newStreakLevel = -3;
      }

      // 3. Calculate Stat Changes (Uses the simplified logic)
      const { healthChange, energeiaChange } = calculateStatChanges(
        difficulty,
        direction, // is_negative is no longer passed
      );

      // 4. Fetch Profile Details (for current stats)
      const { data: profileData, error: profileFetchError } = await supabase
        .from("profiles")
        .select("current_health, max_health, current_energeia, max_energeia")
        .eq("id", userId)
        .single();

      if (profileFetchError || !profileData)
        throw profileFetchError || new Error("Profile not found.");

      const { current_health, max_health, current_energeia, max_energeia } =
        profileData;

      // 5. Apply Stat Changes (with max/min caps)
      let newHealth = current_health + healthChange;
      let newEnergeia = current_energeia + energeiaChange;

      // Cap checks
      newHealth = Math.min(Math.max(newHealth, 0), max_health);
      newEnergeia = Math.min(Math.max(newEnergeia, 0), max_energeia);

      // --- TRANSACTION: Perform both updates ---

      // A. Update Habit Streak
      const { error: streakError } = await supabase
        .from("user_habits")
        .update({
          streak_level: newStreakLevel,
        })
        .eq("id", habitId);

      if (streakError) throw streakError;

      // B. Update Profile Stats
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          current_health: newHealth,
          current_energeia: newEnergeia,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // --- CALENDAR LOG UPDATE START ---
      // 1. Map streak to calendar status
      let calendarStatus: "green" | "orange" | "red" = "orange";
      if (newStreakLevel > 0) {
        calendarStatus = "green";
      } else if (newStreakLevel < 0) {
        calendarStatus = "red";
      } else {
        calendarStatus = "orange"; // Yellow/Neutral
      }

      // 2. Format date for Moscow/Local (YYYY-MM-DD)
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 3. Upsert the log for this specific habit today
      const { error: logError } = await supabase.from("habit_logs").upsert(
        {
          habit_id: habitId,
          user_id: userId,
          log_date: dateKey,
          status: calendarStatus,
          notes: `Auto-logged via button press. Streak: ${newStreakLevel}`,
        },
        { onConflict: "habit_id, log_date" },
      );

      if (logError) console.error("Calendar Log Error:", logError.message);

      await checkStoryDrop(userId); //random drop call

      // 6. Refresh ALL data (Habits list color and Character Stats display)
      await fetchHabits(userId);
      await fetchProfile(userId);
    } catch (e: any) {
      console.error("Score & Stat Update Error:", e.message);
    }
  };

  //Habit editing and deletion
  const handleEditHabit = useCallback((habit: Habit) => {
    setHabitToEdit(habit);
    setIsEditModalVisible(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalVisible(false);
    setHabitToEdit(null);
  }, []);

  // When the modal closes after a save/delete, we need to refresh the habit list
  const handleHabitChange = async () => {
    if (userId) {
      await fetchHabits(userId);
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#0000ff"
          style={styles.loading}
        />
        <Text style={styles.text}>Connecting to the Monastery...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error: {error}</Text>
        <Text style={styles.subtitle}>
          Please check your Supabase credentials, network connection, and RLS
          policies.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CharacterStats
        backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
        characterImageSource={resolveImageSource(profile.character_image_path)}
        currentHealth={profile.current_health}
        maxHealth={profile.max_health}
        currentEnergy={profile.current_energeia}
        maxEnergy={profile.max_energeia}
      />
      <HabitList
        habits={habits}
        onScore={handleScoreHabit}
        onEdit={handleEditHabit}
      />
      <HabitEditModal
        isVisible={isEditModalVisible}
        onClose={handleCloseEditModal}
        habitToEdit={habitToEdit}
        onHabitChange={handleHabitChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loading: {
    marginTop: 40,
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
  },
});
