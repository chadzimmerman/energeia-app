import { supabase } from "./supabase";

// Bump this number whenever you add a new migration entry below.
// Users whose data_version is below this will have pending migrations run
// automatically the next time they open the app.
export const CURRENT_DATA_VERSION = 1;

type Migration = {
  version: number;
  run: (userId: string) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    // Alpha → open beta reset. Items and quests changed significantly between
    // builds, so existing inventory and quest progress are wiped. Habits, logs,
    // level, XP, class, and character appearance are all preserved.
    run: async (userId) => {
      await supabase.from("user_inventory").delete().eq("user_id", userId);
      await supabase.from("user_story_progress").delete().eq("user_id", userId);
      await supabase
        .from("profiles")
        // base_max_health resets alongside max_health: the profile load that
        // follows derives max_health from the base, so resetting only the
        // derived value would be undone immediately.
        .update({ energeia_currency: 0, base_max_health: 100, max_health: 100, current_health: 100 })
        .eq("id", userId);
    },
  },
];

export async function runPendingMigrations(userId: string, currentVersion: number): Promise<void> {
  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    await migration.run(userId);
    // Update version after each migration so a crash mid-run doesn't skip steps
    await supabase
      .from("profiles")
      .update({ data_version: migration.version })
      .eq("id", userId);
  }
}
