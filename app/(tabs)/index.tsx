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
const resolveImageSource = (path: string): ImageSourcePropType => {
  // If the path matches the default local path from the DB
  if (path.includes("novice-monk-male.png")) {
    // Use require() for the local static asset
    return require(DEFAULT_IMAGE_PATH);
  }
  // Otherwise, assume it's a remote URL (like from Supabase Storage)
  return { uri: path };
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
    }, [userId, fetchHabits])
  );

  // SCORE HABIT
  const handleScoreHabit = async (
    habitId: string,
    direction: "up" | "down"
  ) => {
    if (!userId) {
      console.error("Cannot score habit: User ID not available.");
      return;
    }

    try {
      // 1. Get the current habit state
      const { data: habitData, error: fetchError } = await supabase
        .from("user_habits")
        .select("is_positive, is_negative, streak_level")
        .eq("id", habitId)
        .single();

      if (fetchError || !habitData)
        throw fetchError || new Error("Habit not found.");

      const { is_positive, is_negative, streak_level } = habitData;
      let newStreakLevel = streak_level;
      let change = 0;

      // --- Core Streak Logic ---
      if (is_positive && !is_negative) {
        // Positive Habit: + button increases streak, - button decreases streak.
        change = direction === "up" ? 1 : -1;
        newStreakLevel = streak_level + change;
      } else if (is_negative && !is_positive) {
        // Negative Habit: - button increases streak (successful avoidance), + button decreases streak (failure).
        // This is the opposite of a positive habit.
        change = direction === "down" ? 1 : -1;
        newStreakLevel = streak_level + change;
      } else {
        // Mixed Habit (Dual, like Habitica):
        // Treat 'up' as positive, 'down' as negative, but they affect the same streak.
        change = direction === "up" ? 1 : -1;
        newStreakLevel = streak_level + change;
      }

      // Safety Check: Prevent the streak from going below a specific floor (e.g., 0)
      // Adjust this logic if you want to track negative streaks (e.g., set floor to -3)
      // For simplicity, let's ensure the streak never dips below -1.
      if (newStreakLevel < -1) {
        newStreakLevel = -1;
      }

      // 2. Update the streak in the database
      const { error: updateError } = await supabase
        .from("user_habits")
        .update({
          streak_level: newStreakLevel,
          // OPTIONAL: You may want to record the last score date here too
          // last_scored_at: new Date().toISOString(),
        })
        .eq("id", habitId);

      if (updateError) throw updateError;

      // 3. Re-fetch habits immediately after scoring to update the list and color
      await fetchHabits(userId);
    } catch (e: any) {
      console.error("Score Error:", e.message);
      // Display an alert to the user if needed
      // Alert.alert("Error Scoring", "Could not update habit score.");
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
        //characterImageSource={require("../../assets/sprites/characters/monk/novice-monk-male.png")}
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
