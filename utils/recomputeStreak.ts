import { supabase } from "./supabase";
import { computeStreak, type ResetFrequency } from "./computeStreak";

/**
 * Derives streak_level from actual habit_logs history and writes it back to
 * user_habits. Called after any calendar log save so the habits page stays in
 * sync with what the calendar shows.
 *
 * The walk itself lives in `computeStreak`, which is pure and tested. This
 * function is only the I/O around it: read the logs, derive, write the result.
 *
 * Deriving rather than incrementing is the point. A counter drifts the moment a
 * user edits a past day, because the counter and the history it summarizes are
 * two separate records that nothing keeps in agreement.
 */
export const recomputeStreak = async (
  habitId: string,
  userId: string,
  resetFrequency: ResetFrequency,
): Promise<void> => {
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("log_date, status")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .limit(400);

  if (!logs) return;

  const logMap = new Map<string, string>(logs.map((l) => [l.log_date, l.status]));

  await supabase
    .from("user_habits")
    .update({ streak_level: computeStreak(logMap, resetFrequency) })
    .eq("id", habitId);
};
