import {
  clampCurrentHealth,
  computeMaxHealth,
  sumEquippedBuff,
  type EquippedBuffRow,
} from "../statBonuses";

/** Builds a row in the shape the equipped-inventory query returns. */
const row = (stat: string | null, value: number | null): EquippedBuffRow => ({
  item: { hidden_stat_type: stat, hidden_buff_value: value },
});

describe("sumEquippedBuff", () => {
  it("adds up every item carrying the requested stat", () => {
    const rows = [row("health", 5), row("health", 10), row("health", 2)];
    expect(sumEquippedBuff(rows, "health")).toBe(17);
  });

  it("ignores items carrying a different stat", () => {
    const rows = [row("health", 5), row("defense", 100), row("currency", 50)];
    expect(sumEquippedBuff(rows, "health")).toBe(5);
  });

  it("keeps the four stats independent", () => {
    const rows = [row("health", 5), row("energeia", 3), row("currency", 2), row("defense", 1)];
    expect(sumEquippedBuff(rows, "health")).toBe(5);
    expect(sumEquippedBuff(rows, "energeia")).toBe(3);
    expect(sumEquippedBuff(rows, "currency")).toBe(2);
    expect(sumEquippedBuff(rows, "defense")).toBe(1);
  });

  it("returns zero when nothing is equipped", () => {
    expect(sumEquippedBuff([], "health")).toBe(0);
  });

  it("returns zero rather than NaN when the query failed", () => {
    // Supabase hands back null data on error. Treating that as zero keeps a
    // failed read from writing NaN into max_health.
    expect(sumEquippedBuff(null, "health")).toBe(0);
    expect(sumEquippedBuff(undefined, "health")).toBe(0);
  });

  it("skips rows whose item did not join", () => {
    const rows = [row("health", 5), { item: null }, {}] as EquippedBuffRow[];
    expect(sumEquippedBuff(rows, "health")).toBe(5);
  });

  it("treats a null stat or null value as zero", () => {
    const rows = [row("health", 5), row(null, 10), row("health", null)];
    expect(sumEquippedBuff(rows, "health")).toBe(5);
  });

  it("ignores a non-finite value instead of poisoning the total", () => {
    const rows = [row("health", 5), row("health", NaN), row("health", Infinity)];
    expect(sumEquippedBuff(rows, "health")).toBe(5);
  });

  it("lets an item carry a penalty", () => {
    expect(sumEquippedBuff([row("health", 10), row("health", -4)], "health")).toBe(6);
  });
});

describe("computeMaxHealth", () => {
  it("adds equipped health gear to the levelled base", () => {
    expect(computeMaxHealth(120, [row("health", 10), row("health", 5)])).toBe(135);
  });

  it("returns the base when no health gear is equipped", () => {
    expect(computeMaxHealth(120, [row("defense", 10)])).toBe(120);
  });

  it("is idempotent — recomputing does not compound the bonus", () => {
    // This is the whole point of deriving rather than nudging: running it twice
    // on an unchanged loadout has to give the same answer, or a second profile
    // load would inflate max health.
    const rows = [row("health", 10)];
    const once = computeMaxHealth(120, rows);
    const twice = computeMaxHealth(120, rows);
    expect(once).toBe(twice);
    expect(once).toBe(130);
  });

  it("drops the bonus as soon as the item is no longer equipped", () => {
    // The drift case: gear auto-unequipped by a class change used to leave its
    // bonus in max_health forever.
    expect(computeMaxHealth(120, [row("health", 10)])).toBe(130);
    expect(computeMaxHealth(120, [])).toBe(120);
  });

  it("never drops below 1, even if gear penalties exceed the base", () => {
    expect(computeMaxHealth(100, [row("health", -500)])).toBe(1);
  });

  it("falls back to the starting value if the base is not a number", () => {
    expect(computeMaxHealth(NaN, [])).toBe(100);
  });

  it("rounds to a whole number", () => {
    expect(computeMaxHealth(100, [row("health", 2.4)])).toBe(102);
    expect(computeMaxHealth(100, [row("health", 2.6)])).toBe(103);
  });
});

describe("clampCurrentHealth", () => {
  it("leaves current health alone when it fits under the max", () => {
    expect(clampCurrentHealth(80, 120)).toBe(80);
  });

  it("pulls current health down when the ceiling drops", () => {
    // Unequipping health gear lowers max_health; current has to follow.
    expect(clampCurrentHealth(130, 120)).toBe(120);
  });

  it("does not heal when the ceiling rises", () => {
    expect(clampCurrentHealth(50, 200)).toBe(50);
  });

  it("floors at zero", () => {
    expect(clampCurrentHealth(-10, 120)).toBe(0);
  });

  it("allows exactly zero, since that is the death check", () => {
    expect(clampCurrentHealth(0, 120)).toBe(0);
  });

  it("falls back to full when current health is not a number", () => {
    expect(clampCurrentHealth(NaN, 120)).toBe(120);
  });
});
