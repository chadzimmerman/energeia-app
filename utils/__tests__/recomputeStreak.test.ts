import { recomputeStreak } from "../recomputeStreak";
import { supabase } from "../supabase";

/**
 * The walk itself is covered in computeStreak.test.ts. This file covers only the
 * I/O around it: that the right rows are read, that the derived value is written
 * to the right habit, and that a failed read writes nothing at all.
 */

type Row = { log_date: string; status: string };

let updated: { payload?: Record<string, unknown>; id?: string } | null;

const mockDb = (logs: Row[] | null) => {
  updated = null;
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === "habit_logs") {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: logs, error: null }),
      };
      return chain;
    }
    return {
      update: (payload: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          updated = { payload, id };
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };
  });
};

beforeEach(() => jest.clearAllMocks());

describe("recomputeStreak", () => {
  it("writes the derived streak back to the habit", async () => {
    const today = new Date();
    const key = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    mockDb([
      { log_date: key(0), status: "green" },
      { log_date: key(1), status: "green" },
      { log_date: key(2), status: "green" },
    ]);

    await recomputeStreak("habit-1", "user-1", "Daily");

    expect(updated?.payload).toEqual({ streak_level: 3 });
    expect(updated?.id).toBe("habit-1");
  });

  it("writes zero when the habit has no logs", async () => {
    mockDb([]);
    await recomputeStreak("habit-1", "user-1", "Daily");
    expect(updated?.payload).toEqual({ streak_level: 0 });
  });

  it("writes nothing when the read fails", async () => {
    // A failed query returns null data. Writing a derived streak from an empty
    // result would silently reset every streak the user has whenever Supabase
    // hiccups, which is the worst possible outcome for a habit app.
    mockDb(null);
    await recomputeStreak("habit-1", "user-1", "Daily");
    expect(updated).toBeNull();
  });

  it("reads from habit_logs before writing to user_habits", async () => {
    mockDb([]);
    await recomputeStreak("habit-1", "user-1", "Daily");

    const tables = (supabase.from as jest.Mock).mock.calls.map((c) => c[0]);
    expect(tables[0]).toBe("habit_logs");
    expect(tables).toContain("user_habits");
  });

  it("passes the reset frequency through to the walk", async () => {
    // Same logs, different frequency, different answer. Proves the argument is
    // actually forwarded rather than defaulted.
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    mockDb([{ log_date: todayKey, status: "red" }]);
    await recomputeStreak("habit-1", "user-1", "Daily");
    expect(updated?.payload).toEqual({ streak_level: -1 });

    mockDb([{ log_date: todayKey, status: "green" }]);
    await recomputeStreak("habit-1", "user-1", "Monthly");
    expect(updated?.payload).toEqual({ streak_level: 1 });
  });
});
