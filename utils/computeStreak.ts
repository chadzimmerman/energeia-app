/**
 * The streak walk, with no database and no clock of its own.
 *
 * Split out of `recomputeStreak` so it can be tested. The I/O wrapper is three
 * lines; this is where every edge case lives, and it was previously reachable
 * only through a live Supabase query on whatever today happened to be.
 *
 * `today` is a parameter rather than `new Date()` for the same reason: a test
 * that reads the system clock passes on Tuesday and fails on Sunday, because
 * the weekly branch rewinds to Monday.
 */

export type LogStatus = "green" | "orange" | "red" | "grey";
export type ResetFrequency = "Daily" | "Weekly" | "Monthly" | (string & {});

/** Log lookup keyed by `YYYY-MM-DD`, matching `habit_logs.log_date`. */
export type LogMap = Map<string, string>;

const pad = (n: number) => String(n).padStart(2, "0");

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Derives a streak level from habit log history.
 *
 * green  → counts toward the streak (increment)
 * orange → tempted but held on; neutral, does not increment OR break the streak
 * red    → failure; breaks the streak
 * grey / no row → gap; today is allowed to be unlogged without breaking anything
 *
 * A red found before any green yields -1, which the habits page renders as a
 * broken streak rather than a neutral zero. The result is clamped to [-1, ∞).
 */
export function computeStreak(
  logMap: LogMap,
  resetFrequency: ResetFrequency,
  today: Date = new Date(),
): number {
  let streak = 0;

  if (resetFrequency === "Weekly") {
    const d = new Date(today);
    // getDay() is Sunday-first; the week here starts Monday.
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow);

    for (let week = 0; week < 52; week++) {
      let weekGreen = false;
      let weekRed = false;

      for (let day = 0; day < 7; day++) {
        const status = logMap.get(toKey(d));
        if (status === "green") weekGreen = true;
        if (status === "red") weekRed = true;
        d.setDate(d.getDate() + 1);
      }
      // The inner loop advanced 7 days; step back 14 to reach the previous Monday.
      d.setDate(d.getDate() - 14);

      if (weekGreen) {
        streak++;
      } else if (weekRed) {
        if (streak === 0) streak = -1;
        break;
      } else {
        // An orange-only or empty week. The current, still-incomplete week is
        // allowed to be blank; any earlier blank week ends the streak.
        if (week > 0) break;
      }
    }
  } else if (resetFrequency === "Monthly") {
    let y = today.getFullYear();
    let m = today.getMonth();

    for (let month = 0; month < 24; month++) {
      // Day 0 of the next month is the last day of this one, which handles
      // February and leap years without a table.
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let monthGreen = false;
      let monthRed = false;

      for (let day = 1; day <= daysInMonth; day++) {
        const status = logMap.get(`${y}-${pad(m + 1)}-${pad(day)}`);
        if (status === "green") monthGreen = true;
        if (status === "red") monthRed = true;
      }

      if (monthGreen) {
        streak++;
      } else if (monthRed) {
        if (streak === 0) streak = -1;
        break;
      } else {
        if (month > 0) break;
      }

      m--;
      if (m < 0) {
        m = 11;
        y--;
      }
    }
  } else {
    // Daily. Walk backwards one day at a time.
    const d = new Date(today);

    for (let i = 0; i < 400; i++) {
      const status = logMap.get(toKey(d));

      if (!status || status === "grey" || status === "orange") {
        // A gap does not end the streak. Today is allowed to be unlogged, and an
        // orange day in the past is skipped rather than counted, so the walk
        // continues to look for greens beyond it.
        d.setDate(d.getDate() - 1);
        continue;
      }

      if (status === "green") {
        streak++;
      } else {
        if (streak === 0) streak = -1;
        break;
      }

      d.setDate(d.getDate() - 1);
    }
  }

  return Math.max(streak, -1);
}
