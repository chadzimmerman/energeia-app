import { supabase } from "./supabase";

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Derives streak_level from actual habit_logs history and writes it back to
 * user_habits. Called after any calendar log save so the habits page stays in
 * sync with what the calendar shows.
 *
 * green  → counts toward streak (increment)
 * orange → tempted but held on; neutral — does not increment OR break streak
 * red    → failure; breaks streak. If it's the first non-grey log found going
 *          backwards, streak = -1 (red buttons on habits page)
 * grey / no row → gap; today is allowed to be unlogged without breaking streak
 *
 * Result is clamped to [-1, ∞) — same floor as the button-press path.
 */
export const recomputeStreak = async (
  habitId: string,
  userId: string,
  resetFrequency: string,
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
  const today = new Date();
  let newStreak = 0;

  if (resetFrequency === "Weekly") {
    const d = new Date(today);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow); // rewind to Monday of current week

    for (let week = 0; week < 52; week++) {
      let weekGreen = false;
      let weekRed = false;

      for (let day = 0; day < 7; day++) {
        const status = logMap.get(toKey(d));
        if (status === "green") weekGreen = true;
        if (status === "red") weekRed = true;
        d.setDate(d.getDate() + 1);
      }
      d.setDate(d.getDate() - 14); // back to Monday of previous week

      if (weekGreen) {
        newStreak++;
      } else if (weekRed) {
        if (newStreak === 0) newStreak = -1;
        break;
      } else {
        // Orange-only or empty week — allow the current (partial) week, stop otherwise
        if (week > 0) break;
      }
    }
  } else if (resetFrequency === "Monthly") {
    let y = today.getFullYear();
    let m = today.getMonth();

    for (let month = 0; month < 24; month++) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let monthGreen = false;
      let monthRed = false;

      for (let day = 1; day <= daysInMonth; day++) {
        const status = logMap.get(`${y}-${pad(m + 1)}-${pad(day)}`);
        if (status === "green") monthGreen = true;
        if (status === "red") monthRed = true;
      }

      if (monthGreen) {
        newStreak++;
      } else if (monthRed) {
        if (newStreak === 0) newStreak = -1;
        break;
      } else {
        if (month > 0) break;
      }

      m--;
      if (m < 0) { m = 11; y--; }
    }
  } else {
    // Daily: walk backwards one day at a time.
    const d = new Date(today);

    for (let i = 0; i < 400; i++) {
      const status = logMap.get(toKey(d));

      if (!status || status === "grey" || status === "orange") {
        // orange = tempted but held on; treat as a neutral/skipped day
        // Allow today to be unlogged (streak from yesterday still valid)
        if (i === 0) { d.setDate(d.getDate() - 1); continue; }
        // For past days: a gap or orange doesn't instantly end the streak —
        // keep walking back to see if there are greens beyond it
        d.setDate(d.getDate() - 1);
        continue;
      }

      if (status === "green") {
        newStreak++;
      } else {
        // red
        if (newStreak === 0) newStreak = -1;
        break;
      }

      d.setDate(d.getDate() - 1);
    }
  }

  await supabase
    .from("user_habits")
    .update({ streak_level: Math.max(newStreak, -1) })
    .eq("id", habitId);
};
