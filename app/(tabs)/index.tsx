import CharacterStats from "@/components/CharacterStats";
import HabitList from "@/components/HabitList";
import { View } from "@/components/Themed";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageSourcePropType,
  StyleSheet,
  Text,
} from "react-native";
import { supabase } from "../../utils/supabase";

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

  const fetchHabits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_habits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHabits(data as Habit[]);
    } catch (e: any) {
      console.error("Habit Fetch Error:", e.message);
    }
  };

  // SCORE HABIT
  const handleScoreHabit = async (
    habitId: string,
    direction: "up" | "down"
  ) => {
    try {
      const delta = direction === "up" ? 1 : -1;

      const { error } = await supabase
        .from("user_habits")
        .update({
          streak_level: supabase.sql`streak_level + ${delta}`,
        })
        .eq("id", habitId);

      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await fetchHabits(user.id);
      }
    } catch (e: any) {
      console.error("Score Error:", e.message);
    }
  };

  useEffect(() => {
    // 1. Initial Authentication Check (Using anonymous sign-in for simplicity now)
    const authenticateAndFetch = async () => {
      setLoading(true);
      setError(null);

      try {
        let userId: string | null = null;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
          // Already signed in
          userId = user.id;
        } else {
          // Sign in anonymously if no session exists (for development testing)
          const { data, error: signInError } =
            await supabase.auth.signInAnonymously();
          if (signInError) throw signInError;
          userId = data.user?.id || null;
        }

        if (userId) {
          // 2. Fetch or Create Profile
          await fetchProfile(userId);
          await fetchHabits(userId);
        } else {
          setError("Authentication failed: No user ID found.");
          setLoading(false);
        }
      } catch (e: any) {
        console.error("Authentication Error:", e.message);
        setError(`Authentication Error: ${e.message}`);
        setLoading(false);
      }
    };

    // Helper function to fetch the profile data
    const fetchProfile = async (userId: string) => {
      try {
        // Try to fetch existing profile
        let { data: profileData, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // PGRST116: No rows found
          // If no profile exists, create a new one with default values
          const { data: newProfileData, error: insertError } = await supabase
            .from("profiles")
            .insert([
              { id: userId, username: `Novice-${userId.substring(0, 4)}` },
            ])
            .select()
            .single();

          if (insertError) throw insertError;
          profileData = newProfileData;
        } else if (fetchError) {
          // Handle other fetch errors (like RLS issues)
          throw fetchError;
        }

        if (profileData) {
          setProfile(profileData as Profile);
        }
      } catch (e: any) {
        console.error("Profile Fetch/Create Error:", e.message);
        setError(`Profile Setup Error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    authenticateAndFetch();
  }, []); // Run only once on mount

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
      <HabitList habits={habits} onScore={handleScoreHabit} />
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
