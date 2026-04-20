import CharacterStats from "@/components/CharacterStats";
import HabitList from "@/components/HabitList";
import { View } from "@/components/Themed";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { useProfile } from "@/contexts/ProfileContext";
import TutorialOverlay, { hasTutorialBeenSeen } from "@/components/TutorialOverlay";

interface Habit {
  id: string;
  title: string;
  is_positive: boolean;
  is_negative: boolean;
  difficulty: number;
  streak_level: number;
  reset_frequency: string;
}


//item drop percents for seasonal stories
// ── Shared damage formula ─────────────────────────────────────────────────────
// Used by fight quests. difficulty 1–3 × level bonus × class multiplier.
const calculateBossDamage = async (
  userId: string,
  difficulty: number,
  playerClass: string,
  level: number,
  currentEnergeia: number,
): Promise<number> => {
  const levelMult = 1 + level / 100;
  let classMult = 1;

  const cls = playerClass?.toLowerCase();
  if (cls === "monk") {
    // Monk: spiritual energy fuels hits — higher energeia = harder strikes
    classMult = 1 + currentEnergeia / 100;
  } else if (cls === "fighter") {
    // Fighter: equipped defense gear adds damage bonus
    const { data: equipped } = await supabase
      .from("user_inventory")
      .select("item:item_master_id(hidden_stat_type, hidden_buff_value)")
      .eq("user_id", userId)
      .eq("is_equipped", true);
    const gearBuff =
      equipped
        ?.filter((e: any) => e.item?.hidden_stat_type === "defense")
        .reduce((sum: number, e: any) => sum + (e.item?.hidden_buff_value ?? 0), 0) ?? 0;
    classMult = 1 + gearBuff / 5;
  }
  // Noble: classMult stays 1 — their bonuses are coins + XP

  return Math.ceil(difficulty * levelMult * classMult);
};

const checkStoryDrop = async (
  userId: string,
  difficulty: number,
  playerClass: string,
  level: number,
  currentEnergeia: number,
) => {
  const DROP_CHANCE = 0.167; // ~1 in 6 habit completions (collection quests only)

  try {
    const { data: activeProgress, error: fetchError } = await supabase
      .from("user_story_progress")
      .select("*, seasonal_stories!inner(*)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .or("is_paused.eq.false,is_paused.is.null")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError || !activeProgress) return;

    const isFightQuest = activeProgress.seasonal_stories.quest_type === "fight";

    // Fight quests: every positive press deals scaled damage — no random roll
    // Collection quests: keep the 1-in-6 random drop
    let increment = 1;
    if (isFightQuest) {
      increment = await calculateBossDamage(userId, difficulty, playerClass, level, currentEnergeia);
    } else {
      const didDrop = Math.random() < DROP_CHANCE;
      if (!didDrop) return;
    }

    const newCount = activeProgress.current_count + increment;
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

        // 3. Grant class-specific seasonal equipment reward (final parts only)
        let rewardItemName: string | null = null;
        if (!nextStory) {
          // Only grant on the final part — look up this player's class reward
          const { data: profileForClass } = await supabase
            .from("profiles")
            .select("player_class")
            .eq("id", userId)
            .single();

          if (profileForClass?.player_class) {
            const { data: rewardItem } = await supabase
              .from("items_master")
              .select("id, name")
              .eq("required_class", profileForClass.player_class)
              .eq("is_quest_reward", true)
              .eq("season", storyData.season)
              .maybeSingle();

            if (rewardItem) {
              rewardItemName = rewardItem.name;
              await supabase.from("user_inventory").upsert(
                { user_id: userId, item_master_id: rewardItem.id, quantity: 1, is_equipped: false },
                { onConflict: "user_id, item_master_id", ignoreDuplicates: true },
              );
            }
          }
        }

        // Final completion message
        alert(
          `🏆 Quest Part Complete!\nYou earned ${storyData.reward_energeia} Energeia.${rewardItemName ? `\n✨ You received: ${rewardItemName}!` : ""} Check your Storyline tab!`,
        );
      } else if (isFightQuest) {
        alert(`⚔️ You dealt ${increment} damage! (${newCount}/${goal} HP dealt)`);
      } else {
        alert(`✨ You found a ${storyData.required_item_name}! (${newCount}/${goal})`);
      }
      // --- NEW LOGIC END ---
    }
  } catch (e) {
    console.error("Story drop error:", e);
  }
};

// ── Boss daily attack ─────────────────────────────────────────────────────────
// Called on focus. Finds the active fight quest (if any), checks whether the
// boss has already struck today, then applies scaled damage to the player.
// Red habit logs from YESTERDAY increase the boss's damage by 5% per press
// (capped at +50%) — bad habits yesterday make the boss hit harder today.
const checkBossAttack = async (userId: string) => {
  try {
    const { data: activeProgress } = await supabase
      .from("user_story_progress")
      .select("*, seasonal_stories!inner(*)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .eq("is_paused", false)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!activeProgress) return;
    if (activeProgress.seasonal_stories.quest_type !== "fight") return;

    // Build today's date key (YYYY-MM-DD) for the attack guard
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (activeProgress.last_boss_attack_date === todayKey) return; // already hit today

    // Count yesterday's red logs — fuels the damage multiplier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const { data: redLogs } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "red")
      .eq("log_date", yesterdayKey);

    const redCount = redLogs?.length ?? 0;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("current_health, max_health")
      .eq("id", userId)
      .single();

    if (!profileData) return;

    // Base: 2% of player's max health × boss difficulty (1–3)
    const bossDifficulty = activeProgress.seasonal_stories.boss_difficulty ?? 1;
    const baseDamage = Math.ceil(profileData.max_health * bossDifficulty * 0.02);
    const redMult = 1 + Math.min(redCount * 0.05, 0.5);
    const totalDamage = Math.ceil(baseDamage * redMult);

    const newHealth = Math.max(profileData.current_health - totalDamage, 0);

    await supabase
      .from("profiles")
      .update({ current_health: newHealth })
      .eq("id", userId);

    await supabase
      .from("user_story_progress")
      .update({ last_boss_attack_date: todayKey })
      .eq("id", activeProgress.id);

    const redNote =
      redCount > 0
        ? `\n(${redCount} bad habit${redCount > 1 ? "s" : ""} yesterday made it hit harder!)`
        : "";
    alert(
      `⚔️ The ${activeProgress.seasonal_stories.title} attacks!\nYou took ${totalDamage} damage!${redNote}`,
    );
  } catch (e) {
    console.error("Boss attack error:", e);
  }
};

// 1/50 chance per positive habit press (~1 drop per 10 days with 5 daily habits)
const checkScrollDrop = async (userId: string): Promise<void> => {
  if (Math.random() > 1 / 50) return;

  const { data: scrollItem } = await supabase
    .from("items_master")
    .select("id")
    .eq("image_path", "help-wanted-scroll")
    .maybeSingle();

  if (!scrollItem) return;

  const { data: existing } = await supabase
    .from("user_inventory")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_id", scrollItem.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_inventory")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("user_inventory")
      .insert({ user_id: userId, item_id: scrollItem.id, quantity: 1 });
  }

  Alert.alert(
    "📜 Help Wanted!",
    "You found a notice from the town center — someone needs help at the old healer's cottage. Check your inventory!"
  );
};

export default function HabitScreen() {
  const router = useRouter();
  const { profile, equippedOverlays, animalCompanion, wallItems, floorItems, handItems, refreshProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [isDeathModalVisible, setIsDeathModalVisible] = useState(false);
  const [deathLostItemName, setDeathLostItemName] = useState<string | null>(null);
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);


  const fetchHabits = useCallback(async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_habits")
        .select("*")
        .eq("user_id", currentUserId)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHabits(data as Habit[]);
    } catch (e: any) {
      console.error("Habit Fetch Error:", e.message);
      setError(`Habit Fetch Error: ${e.message}`);
    }
  }, []);

  const handleReorder = useCallback(async (reorderedHabits: Habit[]) => {
    setHabits(reorderedHabits); // optimistic update — UI moves instantly
    for (let i = 0; i < reorderedHabits.length; i++) {
      await supabase
        .from("user_habits")
        .update({ order_index: i })
        .eq("id", reorderedHabits[i].id);
    }
  }, []);

  // --- Authentication (Run only once on mount) ---
  useEffect(() => {
    const authenticate = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          setUserId(user.id);
        } else {
          setError("Not logged in.");
        }
      } catch (e: any) {
        console.error("Authentication Error:", e.message);
        setError(`Authentication Error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    authenticate();
  }, []);

  // --- Onboarding redirect — runs when context profile loads ---
  useEffect(() => {
    if (profile && !profile.player_class) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  // --- Show tutorial on first ever visit (after profile is ready) ---
  useEffect(() => {
    if (!userId || !profile || !profile.player_class) return;
    hasTutorialBeenSeen().then((seen) => {
      if (!seen) setIsTutorialVisible(true);
    });
  }, [userId, profile]);

  // --- Habit + context refresh on focus ---
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const runFetch = async () => {
        if (userId && isActive) {
          await checkBossAttack(userId);
          await fetchHabits(userId);
          await refreshProfile();

          // Anniversary achievements — checked lazily on each focus
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.created_at) {
            const yearsOld = (Date.now() - new Date(session.user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            if (yearsOld >= 1) grantAchievement(userId, "year_1");
            if (yearsOld >= 2) grantAchievement(userId, "year_2");
            if (yearsOld >= 3) grantAchievement(userId, "year_3");
          }
        }
      };

      runFetch();

      return () => {
        isActive = false;
      };
    }, [userId, fetchHabits, refreshProfile]),
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
        .select("is_positive, is_negative, streak_level, difficulty, reset_frequency")
        .eq("id", habitId)
        .single();

      if (habitFetchError || !habitData)
        throw habitFetchError || new Error("Habit not found.");

      const { is_positive, is_negative, streak_level, difficulty, reset_frequency } = habitData;

      // 2. Compute today's date key (reused for both the streak check and the log upsert)
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // 3. Calculate Streak Update
      // Negative always resets to 0. Positive only increments once per period.
      let newStreakLevel: number;
      if (direction === "down") {
        newStreakLevel = 0;
      } else {
        // Check if habit was already scored green this period to prevent double-counting
        let periodStart: string;
        if (reset_frequency === "Weekly") {
          const day = now.getDay(); // 0=Sun
          const daysBackToMonday = day === 0 ? 6 : day - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - daysBackToMonday);
          periodStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
        } else if (reset_frequency === "Monthly") {
          periodStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        } else {
          periodStart = dateKey; // Daily: just today
        }

        const { data: existingLog } = await supabase
          .from("habit_logs")
          .select("id")
          .eq("habit_id", habitId)
          .eq("user_id", userId)
          .eq("status", "green")
          .gte("log_date", periodStart)
          .lte("log_date", dateKey)
          .maybeSingle();

        newStreakLevel = existingLog ? streak_level : streak_level + 1;
      }

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
      // Sum bonuses from all currently equipped items
      let energeiaFlatBonus = 0;
      let healthEquipBonus = 0;
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

        // Health gear bonus applied once per level-up (fighters benefit most)
        healthEquipBonus =
          equippedBonuses
            ?.filter((e: any) => e.item?.hidden_stat_type === "health")
            .reduce((sum: number, e: any) => sum + (e.item?.hidden_buff_value ?? 0), 0) ?? 0;
      }

      let newHealth = Math.min(Math.max(current_health + healthChange, 0), max_health);
      let newEnergeia = current_energeia + energeiaChange + energeiaFlatBonus;
      let newLevel = level;
      let newMaxHealth = max_health;
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
        // Fighter: gear bonus feeds into boss damage and health growth

        let levelThreshold = 100 + (newLevel - 1) * 20;
        while (newEnergeia >= levelThreshold) {
          newEnergeia -= levelThreshold;
          newLevel += 1;
          // Max health grows 5 base + equipped health gear bonus each level
          newMaxHealth += 5 + healthEquipBonus;
          didLevelUp = true;
          levelThreshold = 100 + (newLevel - 1) * 20;
        }
      } else {
        // Penalty: XP bar goes down but floors at 0 (never lose a level)
        newEnergeia = Math.max(newEnergeia, 0);
      }

      // Level up restores health to the new (grown) max
      if (didLevelUp) {
        newHealth = newMaxHealth;
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
        await refreshProfile();
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
          ...(didLevelUp ? { max_health: newMaxHealth } : {}),
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      if (didLevelUp) {
        alert(`You have reached Level ${newLevel}!\nMax health increased to ${newMaxHealth} and fully restored.`);
      }

      // --- ACHIEVEMENT GRANTS ---
      if (direction === "up") {
        grantAchievement(userId, "first_task");
        if (newStreakLevel >= 7)   grantAchievement(userId, "streak_7");
        if (newStreakLevel >= 30)  grantAchievement(userId, "streak_30");
        if (newStreakLevel >= 180) grantAchievement(userId, "streak_180");
        if (newStreakLevel >= 365) grantAchievement(userId, "streak_365");
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

      if (direction === "up") {
        await checkStoryDrop(userId, difficulty, player_class ?? "", level, current_energeia);
        await checkScrollDrop(userId);
      }

      // 6. Refresh ALL data (Habits list color and Character Stats display)
      await fetchHabits(userId);
      await refreshProfile();
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
        equippedOverlays={equippedOverlays}
        level={profile.level}
        animalCompanion={animalCompanion}
        wallItems={wallItems}
        floorItems={floorItems}
        handItems={handItems}
      />
      <HabitList
        habits={habits}
        onScore={handleScoreHabit}
        onEdit={handleEditHabit}
        onReorder={handleReorder}
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
      <TutorialOverlay
        visible={isTutorialVisible}
        onDismiss={() => setIsTutorialVisible(false)}
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
