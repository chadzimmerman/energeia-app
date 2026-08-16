import { ALL_ACHIEVEMENTS, getAchievementImageSource } from "../../data/achievements";
import { grantAchievement } from "../grantAchievement";
import { supabase } from "../supabase";

describe("ALL_ACHIEVEMENTS", () => {
  it("defines at least one achievement", () => {
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it("has no duplicate ids", () => {
    // An id is the primary key in user_achievements. A duplicate here means two
    // achievements silently share a row, and unlocking one unlocks the other.
    const ids = ALL_ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate titles", () => {
    const titles = ALL_ACHIEVEMENTS.map((a) => a.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every achievement a non-empty id, title and description", () => {
    for (const achievement of ALL_ACHIEVEMENTS) {
      expect(achievement.id.trim()).not.toBe("");
      expect(achievement.title.trim()).not.toBe("");
      expect(achievement.description.trim()).not.toBe("");
    }
  });

  it("uses snake_case ids with no whitespace", () => {
    // Ids travel to the database and into URLs. Keeping the shape uniform stops
    // a stray capital or space from creating a second, unreachable achievement.
    for (const achievement of ALL_ACHIEVEMENTS) {
      expect(achievement.id).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("resolves art for every achievement once earned", () => {
    // imageKey is looked up in a bundled map. A typo yields no art on a screen
    // whose entire purpose is showing art.
    for (const achievement of ALL_ACHIEVEMENTS) {
      expect(getAchievementImageSource(achievement.imageKey, true)).toBeDefined();
    }
  });

  it("resolves a locked icon for every achievement not yet earned", () => {
    for (const achievement of ALL_ACHIEVEMENTS) {
      expect(getAchievementImageSource(achievement.imageKey, false)).toBeDefined();
    }
  });
});

describe("getAchievementImageSource", () => {
  it("returns the real art when achieved", () => {
    const key = ALL_ACHIEVEMENTS[0].imageKey;
    expect(getAchievementImageSource(key, true)).not.toBe(
      getAchievementImageSource(key, false),
    );
  });

  it("returns the same blank icon for every unearned achievement", () => {
    // The locked state is one shared silhouette, so unearned rows must not leak
    // which achievement they are.
    const blanks = ALL_ACHIEVEMENTS.map((a) => getAchievementImageSource(a.imageKey, false));
    expect(new Set(blanks).size).toBe(1);
  });

  // Note: an unknown imageKey has no runtime fallback and would return
  // undefined. That is prevented by the `keyof typeof ACHIEVEMENTS_IMAGES`
  // parameter type rather than by a check, and every caller reads the key from
  // the static ALL_ACHIEVEMENTS array, so it is unreachable today.
});

describe("grantAchievement", () => {
  let upsert: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    upsert = jest.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });
  });

  it("writes to user_achievements", async () => {
    await grantAchievement("user-1", "first_task");
    expect(supabase.from).toHaveBeenCalledWith("user_achievements");
  });

  it("records the user, the achievement, and the achieved flag", async () => {
    await grantAchievement("user-1", "first_task");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", achievement_id: "first_task", is_achieved: true },
      expect.anything(),
    );
  });

  it("upserts on the user and achievement pair, so repeat calls are safe", async () => {
    // Achievement checks run on every habit completion. Without the conflict
    // target this would insert a duplicate row on every single completion.
    await grantAchievement("user-1", "first_task");
    expect(upsert).toHaveBeenCalledWith(expect.anything(), {
      onConflict: "user_id,achievement_id",
    });
  });

  it("can be called repeatedly for the same achievement", async () => {
    await grantAchievement("user-1", "first_task");
    await grantAchievement("user-1", "first_task");
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("grants every defined achievement without throwing", async () => {
    for (const achievement of ALL_ACHIEVEMENTS) {
      await expect(grantAchievement("user-1", achievement.id)).resolves.toBeUndefined();
    }
  });
});
