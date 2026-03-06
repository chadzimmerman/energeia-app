import CharacterStats from "@/components/CharacterStats";
import HabitList from "@/components/HabitList";
import { View } from "@/components/Themed";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import { supabase } from "../../utils/supabase";
import { getSeasonalBackground } from "../../utils/seasons";
import { grantAchievement } from "../../utils/grantAchievement";
import { resolveCharacterImage } from "../../utils/resolveCharacterImage";
import HabitEditModal from "../HabitEditModal";
import DeathModal from "../DeathModal";

interface Profile {
  id: string;
  username: string;
  current_health: number;
  max_health: number;
  current_energeia: number;
  max_energeia: number;
  energeia_currency: number;
  level: number;
  character_image_path: string;
}

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  difficulty: number;
  streak_level: number;
}


//item drop percents for seasonal stories
const checkStoryDrop = async (userId: string) => {
  const DROP_CHANCE = 0.167; // ~1 in 6 habit completions

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
          .select("current_energeia, level, energeia_currency, max_health")
          .eq("id", userId)
          .single();

        if (profile) {
          const reward = storyData.reward_energeia || 0;
          let newEnergeia = profile.current_energeia + reward;
          let newLevel = profile.level;
          const newCurrency = profile.energeia_currency + reward;
          let didLevelUp = false;

          let levelThreshold = 100 + (newLevel - 1) * 20;
          while (newEnergeia >= levelThreshold) {
            newEnergeia -= levelThreshold;
            newLevel += 1;
            didLevelUp = true;
            levelThreshold = 100 + (newLevel - 1) * 20;
          }

          const updateData: any = {
            current_energeia: newEnergeia,
            level: newLevel,
            energeia_currency: newCurrency,
          };
          if (didLevelUp) {
            updateData.current_health = profile.max_health;
          }

          await supabase
            .from("profiles")
            .update(updateData)
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

        // 3. Grant seasonal reward item (final parts only — when reward_item_id is set)
        let rewardItemName: string | null = null;
        if (storyData.reward_item_id) {
          const { data: itemData } = await supabase
            .from("items_master")
            .select("name")
            .eq("id", storyData.reward_item_id)
            .single();
          rewardItemName = itemData?.name ?? null;

          await supabase.from("user_inventory").upsert(
            { user_id: userId, item_master_id: storyData.reward_item_id, quantity: 1, is_equipped: false },
            { onConflict: "user_id, item_master_id", ignoreDuplicates: true },
          );
        }

        // Final completion message
        alert(
          `🏆 Quest Part Complete!\nYou earned ${storyData.reward_energeia} Energeia.${rewardItemName ? `\n✨ You received: ${rewardItemName}!` : ""} Check your Storyline tab!`,
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
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [isDeathModalVisible, setIsDeathModalVisible] = useState(false);
  const [deathLostItemName, setDeathLostItemName] = useState<string | null>(null);

  const fetchProfile = useCallback(async (currentUserId: string, checkOnboarding = false) => {
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
              current_energeia: 0,
              energeia_currency: 0,
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
        // Only check onboarding on initial load, not on stat refreshes
        if (checkOnboarding && !profileData.player_class) {
          console.log("No player_class found, redirecting to onboarding. Value:", profileData.player_class);
          router.replace("/onboarding");
          return;
        }
        setProfile(profileData as Profile);
      }
    } catch (e: any) {
      console.error("Profile Fetch/Create Error:", e.message);
      setError(`Profile Setup Error: ${e.message}`);
    }
  }, [router]);

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
          // No session — _layout.tsx will redirect to login, so nothing to do here
          setError("Not logged in.");
          return;
        }

        if (currentUserId) {
          setUserId(currentUserId);
          await fetchProfile(currentUserId, true);
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
    streakLevel: number,
  ): { healthChange: number; energeiaChange: number } => {
    const clampedDifficulty = Math.min(Math.max(difficulty, 1), 10);
    const healthDamageMultiplier = 1.5;

    // Base reward: D1=1, D5=3, D10=5
    const REWARD_BY_DIFFICULTY: { [key: number]: number } = { 1: 1, 5: 3, 10: 5 };
    const rewardMagnitude = REWARD_BY_DIFFICULTY[clampedDifficulty] ?? 1;

    // Base penalty capped at 5
    const penaltyMagnitude = Math.min(clampedDifficulty, 5);

    // Streak tier — drives bonuses and penalty modifiers
    // Blue (≥7 days): +2 energeia bonus, 50% lighter penalty
    // Green (1–6):    +1 energeia bonus, 25% lighter penalty
    // Yellow (0):     no bonus,          full penalty
    // Red (<0):       no bonus,          25% heavier penalty
    const streakTier =
      streakLevel >= 7 ? "blue" :
      streakLevel >= 1 ? "green" :
      streakLevel === 0 ? "yellow" : "red";

    const streakBonus  = streakTier === "blue" ? 2 : streakTier === "green" ? 1 : 0;
    const penaltyMult  = streakTier === "blue" ? 0.5 : streakTier === "green" ? 0.75 : streakTier === "yellow" ? 1.0 : 1.25;

    let healthChange = 0;
    let energeiaChange = 0;

    if (direction === "up") {
      energeiaChange = rewardMagnitude + streakBonus;
    } else if (direction === "down") {
      healthChange   = -Math.round(penaltyMagnitude * healthDamageMultiplier * penaltyMult);
      energeiaChange = -Math.round(penaltyMagnitude * penaltyMult);
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

      // 2. Compute today's date key (reused for both the streak check and the log upsert)
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 3. Calculate Streak Update — each press counts (no per-day cap)
      const newStreakLevel = direction === "up" ? streak_level + 1 : streak_level - 1;

      // 3. Calculate Stat Changes (Uses the simplified logic)
      const { healthChange, energeiaChange } = calculateStatChanges(
        difficulty,
        direction,
        streak_level,
      );

      // 4. Fetch Profile Details (for current stats)
      const { data: profileData, error: profileFetchError } = await supabase
        .from("profiles")
        .select("current_health, max_health, current_energeia, level, energeia_currency, player_class")
        .eq("id", userId)
        .single();

      if (profileFetchError || !profileData)
        throw profileFetchError || new Error("Profile not found.");

      const { current_health, max_health, current_energeia, level, energeia_currency, player_class } =
        profileData;

      // 5. Apply Stat Changes
      // Sum flat energeia bonus from all currently equipped items (XP only, not currency)
      let energeiaFlatBonus = 0;
      if (energeiaChange > 0) {
        const { data: equippedBonuses } = await supabase
          .from("user_inventory")
          .select("item:item_master_id(hidden_stat_type, hidden_buff_value)")
          .eq("user_id", userId)
          .eq("is_equipped", true);

        energeiaFlatBonus =
          equippedBonuses
            ?.filter((e: any) => e.item?.hidden_stat_type === "energeia")
            .reduce((sum: number, e: any) => sum + (e.item?.hidden_buff_value ?? 0), 0) ?? 0;
      }

      let newHealth = Math.min(Math.max(current_health + healthChange, 0), max_health);
      let newEnergeia = current_energeia + energeiaChange + energeiaFlatBonus;
      let newLevel = level;
      let newCurrency = energeia_currency;
      let didLevelUp = false;

      if (energeiaChange > 0) {
        // Earning: tick up the wallet and handle level-up with overflow carry-forward
        newCurrency = energeia_currency + energeiaChange;

        // Class bonuses (applied to raw earned amount before level-up processing)
        const cls = player_class?.toLowerCase();
        if (cls === "monk") {
          // Monk: +10% to XP earned
          newEnergeia += Math.round(energeiaChange * 0.10);
        } else if (cls === "noble") {
          // Noble: +10% to coin wallet
          newCurrency += Math.round(energeiaChange * 0.10);
        }
        // Fighter: +1% damage to bosses — wired up when boss system is added

        let levelThreshold = 100 + (newLevel - 1) * 20;
        while (newEnergeia >= levelThreshold) {
          newEnergeia -= levelThreshold;
          newLevel += 1;
          didLevelUp = true;
          levelThreshold = 100 + (newLevel - 1) * 20;
        }
      } else {
        // Penalty: XP bar goes down but floors at 0 (never lose a level)
        newEnergeia = Math.max(newEnergeia, 0);
      }

      // Level up restores health to full
      if (didLevelUp) {
        newHealth = max_health;
      }

      // --- TRANSACTION: Perform both updates ---

      // A. Update Habit Streak
      const { error: streakError } = await supabase
        .from("user_habits")
        .update({
          streak_level: newStreakLevel,
        })
        .eq("id", habitId);

      if (streakError) throw streakError;

      // ── DEATH CHECK ──────────────────────────────────────────────────────
      if (newHealth <= 0) {
        // 1. Lose a random inventory item (if any)
        let lostItemName: string | null = null;
        const { data: inventory } = await supabase
          .from("user_inventory")
          .select("id, item_master_id")
          .eq("user_id", userId);

        if (inventory && inventory.length > 0) {
          const victim = inventory[Math.floor(Math.random() * inventory.length)];
          const { data: itemData } = await supabase
            .from("items_master")
            .select("name")
            .eq("id", (victim as any).item_master_id)
            .single();
          lostItemName = itemData?.name ?? null;
          await supabase.from("user_inventory").delete().eq("id", victim.id);
        }

        // 2. Apply death penalties — reset level, wipe energeia, restore health
        await supabase
          .from("profiles")
          .update({
            level: 1,
            current_energeia: 0,
            energeia_currency: 0,
            current_health: max_health,
          })
          .eq("id", userId);

        // 3. Log the red calendar entry
        await supabase.from("habit_logs").upsert(
          {
            habit_id: habitId,
            user_id: userId,
            log_date: dateKey,
            status: "red",
            notes: `Fallen. Streak: ${newStreakLevel}`,
          },
          { onConflict: "habit_id, log_date" },
        );

        // 4. Show death modal and refresh display
        setDeathLostItemName(lostItemName);
        setIsDeathModalVisible(true);
        await fetchHabits(userId);
        await fetchProfile(userId);
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      // B. Update Profile Stats
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          current_health: newHealth,
          current_energeia: newEnergeia,
          level: newLevel,
          energeia_currency: newCurrency,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      if (didLevelUp) {
        alert(`You have reached Level ${newLevel}! Your health has been fully restored.`);
      }

      // --- ACHIEVEMENT GRANTS ---
      if (direction === "up") {
        grantAchievement(userId, "first_task");
      }
      if (newLevel >= 10) grantAchievement(userId, "level_10");
      if (newLevel >= 20) grantAchievement(userId, "level_20");
      if (newLevel >= 30) grantAchievement(userId, "level_30");

      // --- CALENDAR LOG UPDATE START ---
      // + press = green, - press = red
      const calendarStatus: "green" | "red" = direction === "up" ? "green" : "red";

      // Upsert the log for this specific habit today
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

      if (direction === "up") await checkStoryDrop(userId); //random drop call

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

  if (!profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CharacterStats
        backgroundImageSource={getSeasonalBackground()}
        characterImageSource={resolveCharacterImage(profile.character_image_path, profile.level)}
        currentHealth={profile.current_health}
        maxHealth={profile.max_health}
        currentEnergy={profile.current_energeia}
        maxEnergy={100 + (profile.level - 1) * 20}
        level={profile.level}
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
      <DeathModal
        visible={isDeathModalVisible}
        gender={profile.character_image_path?.includes("_female") ? "female" : "male"}
        lostItemName={deathLostItemName}
        onRise={() => setIsDeathModalVisible(false)}
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
