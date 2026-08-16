import { computeStreak, toKey, type LogMap } from "../computeStreak";

/**
 * Every test pins `today` explicitly. The weekly branch rewinds to Monday and
 * the monthly branch counts real calendar days, so a suite that read the system
 * clock would pass on some days and fail on others.
 *
 * Anchors:
 *   2026-08-12 is a Wednesday.
 *   2026-03-01 is a Sunday, which is the value getDay() maps to 6, not 0.
 */
const WED = new Date(2026, 7, 12); // Aug 12 2026
const SUN = new Date(2026, 2, 1); //  Mar 1 2026

/** Builds a log map from `{ 'YYYY-MM-DD': status }`. */
const logs = (entries: Record<string, string>): LogMap =>
  new Map(Object.entries(entries));

/** N consecutive days of one status, walking backwards from `from`. */
const run = (from: Date, count: number, status: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const d = new Date(from);
  for (let i = 0; i < count; i++) {
    out[toKey(d)] = status;
    d.setDate(d.getDate() - 1);
  }
  return out;
};

describe("toKey", () => {
  it("zero-pads month and day", () => {
    expect(toKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses local calendar fields, not UTC", () => {
    // A late-evening local date must not roll forward to the next UTC day, or a
    // catch logged at 9pm would file itself under tomorrow.
    const late = new Date(2026, 7, 12, 23, 30);
    expect(toKey(late)).toBe("2026-08-12");
  });
});

describe("computeStreak — daily", () => {
  it("counts an unbroken run of greens", () => {
    expect(computeStreak(logs(run(WED, 5, "green")), "Daily", WED)).toBe(5);
  });

  it("returns 0 for an empty history", () => {
    expect(computeStreak(logs({}), "Daily", WED)).toBe(0);
  });

  it("allows today to be unlogged without breaking the streak", () => {
    // Yesterday backwards is green; today has no row yet.
    const yesterday = new Date(2026, 7, 11);
    expect(computeStreak(logs(run(yesterday, 3, "green")), "Daily", WED)).toBe(3);
  });

  it("stops counting at the first red", () => {
    expect(
      computeStreak(
        logs({ ...run(WED, 2, "green"), "2026-08-10": "red", "2026-08-09": "green" }),
        "Daily",
        WED,
      ),
    ).toBe(2);
  });

  it("returns -1 when a red is the most recent meaningful log", () => {
    expect(computeStreak(logs({ "2026-08-12": "red" }), "Daily", WED)).toBe(-1);
  });

  it("returns -1 when a red follows only gaps, not greens", () => {
    expect(computeStreak(logs({ "2026-08-09": "red" }), "Daily", WED)).toBe(-1);
  });

  it("treats orange as neutral, neither counting nor breaking", () => {
    // Green, orange, green. The orange is skipped and the walk continues.
    expect(
      computeStreak(
        logs({ "2026-08-12": "green", "2026-08-11": "orange", "2026-08-10": "green" }),
        "Daily",
        WED,
      ),
    ).toBe(2);
  });

  it("treats grey the same as a missing row", () => {
    expect(
      computeStreak(
        logs({ "2026-08-12": "green", "2026-08-11": "grey", "2026-08-10": "green" }),
        "Daily",
        WED,
      ),
    ).toBe(2);
  });

  it("walks across a gap to find greens beyond it", () => {
    // A missing day is not a failure, so the older green still counts.
    expect(
      computeStreak(logs({ "2026-08-12": "green", "2026-08-08": "green" }), "Daily", WED),
    ).toBe(2);
  });

  it("never returns below -1", () => {
    expect(
      computeStreak(logs(run(WED, 10, "red")), "Daily", WED),
    ).toBeGreaterThanOrEqual(-1);
  });

  it("crosses a month boundary", () => {
    const aug1 = new Date(2026, 7, 1);
    // Aug 1 back through Jul 30.
    const map = logs({ "2026-08-01": "green", "2026-07-31": "green", "2026-07-30": "green" });
    expect(computeStreak(map, "Daily", aug1)).toBe(3);
  });

  it("crosses a year boundary", () => {
    const jan1 = new Date(2026, 0, 1);
    const map = logs({ "2026-01-01": "green", "2025-12-31": "green", "2025-12-30": "green" });
    expect(computeStreak(map, "Daily", jan1)).toBe(3);
  });

  it("stops at the 400 day lookback and does not hang", () => {
    // Two years of greens; the walk is capped, so the result is bounded.
    const map = logs(run(WED, 800, "green"));
    const result = computeStreak(map, "Daily", WED);
    expect(result).toBeLessThanOrEqual(400);
    expect(result).toBeGreaterThan(300);
  });
});

describe("computeStreak — weekly", () => {
  it("counts a week containing at least one green", () => {
    // Wed Aug 12 sits in the week beginning Mon Aug 10.
    expect(computeStreak(logs({ "2026-08-12": "green" }), "Weekly", WED)).toBe(1);
  });

  it("counts one week per green week, not one per green day", () => {
    // Three greens in the same week is still a single week.
    expect(
      computeStreak(
        logs({ "2026-08-10": "green", "2026-08-11": "green", "2026-08-12": "green" }),
        "Weekly",
        WED,
      ),
    ).toBe(1);
  });

  it("counts consecutive green weeks", () => {
    expect(
      computeStreak(
        logs({ "2026-08-12": "green", "2026-08-05": "green", "2026-07-29": "green" }),
        "Weekly",
        WED,
      ),
    ).toBe(3);
  });

  it("allows the current week to be blank without breaking", () => {
    // Nothing logged this week yet; last week was green.
    expect(computeStreak(logs({ "2026-08-05": "green" }), "Weekly", WED)).toBe(1);
  });

  it("ends the streak on an earlier blank week", () => {
    // This week green, last week blank, the week before green. The blank stops it.
    expect(
      computeStreak(logs({ "2026-08-12": "green", "2026-07-29": "green" }), "Weekly", WED),
    ).toBe(1);
  });

  it("a green day outranks a red day in the same week", () => {
    expect(
      computeStreak(
        logs({ "2026-08-10": "red", "2026-08-12": "green" }),
        "Weekly",
        WED,
      ),
    ).toBe(1);
  });

  it("returns -1 for a red-only current week", () => {
    expect(computeStreak(logs({ "2026-08-12": "red" }), "Weekly", WED)).toBe(-1);
  });

  it("treats Sunday as the last day of the week, not the first", () => {
    // Mar 1 2026 is a Sunday, so its week began Mon Feb 23. A green on Feb 23
    // is in the *current* week and must count.
    expect(computeStreak(logs({ "2026-02-23": "green" }), "Weekly", SUN)).toBe(1);
  });

  it("does not count a Monday from the following week", () => {
    // Mar 2 is the Monday after the SUN anchor's week, so it is in the future
    // relative to that week and must not be counted.
    expect(computeStreak(logs({ "2026-03-02": "green" }), "Weekly", SUN)).toBe(0);
  });
});

describe("computeStreak — monthly", () => {
  it("counts a month containing at least one green", () => {
    expect(computeStreak(logs({ "2026-08-03": "green" }), "Monthly", WED)).toBe(1);
  });

  it("counts consecutive green months", () => {
    expect(
      computeStreak(
        logs({ "2026-08-03": "green", "2026-07-15": "green", "2026-06-30": "green" }),
        "Monthly",
        WED,
      ),
    ).toBe(3);
  });

  it("allows the current month to be blank", () => {
    expect(computeStreak(logs({ "2026-07-15": "green" }), "Monthly", WED)).toBe(1);
  });

  it("ends the streak on an earlier blank month", () => {
    expect(
      computeStreak(logs({ "2026-08-03": "green", "2026-06-30": "green" }), "Monthly", WED),
    ).toBe(1);
  });

  it("returns -1 for a red-only current month", () => {
    expect(computeStreak(logs({ "2026-08-03": "red" }), "Monthly", WED)).toBe(-1);
  });

  it("reads all 31 days of a 31 day month", () => {
    expect(computeStreak(logs({ "2026-08-31": "green" }), "Monthly", WED)).toBe(1);
  });

  it("reads day 29 of a leap February", () => {
    // 2028 is a leap year. A green on Feb 29 must be found, which only works if
    // the day count comes from the calendar rather than a fixed 28.
    const mar2028 = new Date(2028, 1, 29);
    expect(computeStreak(logs({ "2028-02-29": "green" }), "Monthly", mar2028)).toBe(1);
  });

  it("crosses a year boundary backwards", () => {
    const jan = new Date(2026, 0, 15);
    expect(
      computeStreak(
        logs({ "2026-01-10": "green", "2025-12-20": "green", "2025-11-05": "green" }),
        "Monthly",
        jan,
      ),
    ).toBe(3);
  });
});

describe("computeStreak — frequency dispatch", () => {
  it("treats an unknown frequency as daily", () => {
    // The habits table is free text; anything not Weekly or Monthly falls
    // through to the daily walk rather than throwing.
    expect(computeStreak(logs(run(WED, 4, "green")), "Fortnightly", WED)).toBe(4);
  });

  it("is idempotent for the same inputs", () => {
    const map = logs(run(WED, 6, "green"));
    expect(computeStreak(map, "Daily", WED)).toBe(computeStreak(map, "Daily", WED));
  });

  it("does not mutate the log map", () => {
    const map = logs(run(WED, 3, "green"));
    const before = new Map(map);
    computeStreak(map, "Daily", WED);
    expect([...map.entries()]).toEqual([...before.entries()]);
  });

  it("does not mutate the date it is given", () => {
    // The walk copies `today` before stepping backwards. If it did not, every
    // call would move the caller's clock and the second call would disagree.
    const today = new Date(2026, 7, 12);
    computeStreak(logs(run(WED, 5, "green")), "Weekly", today);
    expect(today.getTime()).toBe(new Date(2026, 7, 12).getTime());
  });
});
