import { runPendingMigrations, CURRENT_DATA_VERSION } from "../migrations";
import { supabase } from "../supabase";

/**
 * Records every table touched, in order, so a test can assert both what a
 * migration did and that the version write followed it.
 */
type Call = { table: string; op: string; payload?: unknown };

let calls: Call[];

const chain = (table: string) => ({
  delete: () => {
    calls.push({ table, op: "delete" });
    return { eq: () => Promise.resolve({ data: null, error: null }) };
  },
  update: (payload: unknown) => {
    calls.push({ table, op: "update", payload });
    return { eq: () => Promise.resolve({ data: null, error: null }) };
  },
});

beforeEach(() => {
  calls = [];
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockImplementation((table: string) => chain(table));
});

describe("runPendingMigrations", () => {
  it("runs nothing when the user is already current", async () => {
    await runPendingMigrations("user-1", CURRENT_DATA_VERSION);
    expect(calls).toHaveLength(0);
  });

  it("runs nothing when the user is somehow ahead", async () => {
    // A downgraded install should not have its data rewritten backwards.
    await runPendingMigrations("user-1", CURRENT_DATA_VERSION + 5);
    expect(calls).toHaveLength(0);
  });

  it("runs pending migrations for a user at version 0", async () => {
    await runPendingMigrations("user-1", 0);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("writes the new data_version after each migration", async () => {
    await runPendingMigrations("user-1", 0);

    const versionWrites = calls.filter(
      (c) =>
        c.table === "profiles" &&
        c.op === "update" &&
        typeof (c.payload as { data_version?: number })?.data_version === "number",
    );

    expect(versionWrites).toHaveLength(CURRENT_DATA_VERSION);
    expect(
      (versionWrites.at(-1)?.payload as { data_version: number }).data_version,
    ).toBe(CURRENT_DATA_VERSION);
  });

  it("writes the version last, so a crash mid-run repeats rather than skips", async () => {
    // If the version were written first, a crash between the write and the work
    // would leave the user marked as migrated with unmigrated data. Repeating a
    // migration is recoverable; skipping one is not.
    await runPendingMigrations("user-1", 0);

    const lastCall = calls.at(-1);
    expect(lastCall?.table).toBe("profiles");
    expect((lastCall?.payload as { data_version?: number })?.data_version).toBe(
      CURRENT_DATA_VERSION,
    );
  });

  it("preserves habits and logs while resetting inventory and quests", async () => {
    // The migration's stated promise. Habits, logs, level, XP, class and
    // appearance survive; inventory and story progress do not. A test here means
    // the promise cannot quietly change.
    await runPendingMigrations("user-1", 0);

    const deleted = calls.filter((c) => c.op === "delete").map((c) => c.table);
    expect(deleted).toContain("user_inventory");
    expect(deleted).toContain("user_story_progress");
    expect(deleted).not.toContain("user_habits");
    expect(deleted).not.toContain("habit_logs");
    expect(deleted).not.toContain("profiles");
  });

  it("resets currency and health without touching level or class", async () => {
    await runPendingMigrations("user-1", 0);

    const profileReset = calls.find(
      (c) =>
        c.table === "profiles" &&
        c.op === "update" &&
        (c.payload as { energeia_currency?: number })?.energeia_currency !== undefined,
    );

    expect(profileReset).toBeDefined();
    const payload = profileReset!.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("energeia_currency", 0);
    // Both halves of max health, not just the derived one. Resetting max_health
    // alone would be undone by the next profile load, which recomputes it from
    // base_max_health plus equipped gear.
    expect(payload).toHaveProperty("max_health", 100);
    expect(payload).toHaveProperty("base_max_health", 100);
    expect(payload).not.toHaveProperty("level");
    expect(payload).not.toHaveProperty("character_class");
  });

  it("is idempotent once the user reaches the current version", async () => {
    await runPendingMigrations("user-1", 0);
    const firstRun = calls.length;

    calls = [];
    await runPendingMigrations("user-1", CURRENT_DATA_VERSION);

    expect(firstRun).toBeGreaterThan(0);
    expect(calls).toHaveLength(0);
  });
});
