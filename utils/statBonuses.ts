/**
 * Equipped-item stat bonuses.
 *
 * Items carry a hidden_stat_type and a hidden_buff_value. Four types are in
 * play: "health" raises max health, "energeia" and "currency" add a flat amount
 * when a habit is scored positive, and "defense" feeds the fighter's damage
 * multiplier.
 *
 * Health is the one that needs care. The other three are read at the moment
 * they are used and never stored, so they cannot drift. Health is different:
 * max_health is a stored column, so if it is only ever nudged up and down by
 * equip and unequip, any path that changes what is equipped without adjusting
 * it leaves the number permanently wrong. ProfileContext's auto-unequip of
 * class-mismatched gear is exactly such a path.
 *
 * The fix is to stop nudging. max_health is derived from base_max_health, which
 * only levelling changes, plus whatever is equipped right now — recomputed on
 * every profile load. Then no path can drift it, including ones added later.
 */

/** The shape the equipped-inventory queries come back in. */
export interface EquippedBuffRow {
  item?: {
    hidden_stat_type?: string | null;
    hidden_buff_value?: number | null;
  } | null;
}

export type BuffStat = "health" | "energeia" | "currency" | "defense";

/**
 * Total bonus for one stat across every equipped item.
 *
 * Missing rows, missing items, null stats and null values all count as zero, so
 * a partial or failed query degrades to "no bonus" rather than NaN. Negative
 * values are allowed through — an item is free to carry a penalty — but the
 * result is floored at zero for health by computeMaxHealth below.
 */
export function sumEquippedBuff(
  rows: EquippedBuffRow[] | null | undefined,
  stat: BuffStat,
): number {
  if (!rows) return 0;
  return rows.reduce((total, row) => {
    if (row?.item?.hidden_stat_type !== stat) return total;
    const value = row.item?.hidden_buff_value;
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

/**
 * Effective max health: what levelling earned, plus what is equipped now.
 *
 * Never returns less than 1. A player whose gear somehow totals a large penalty
 * should be weak, not unkillable-by-zero-division or instantly dead on load.
 */
export function computeMaxHealth(
  baseMaxHealth: number,
  rows: EquippedBuffRow[] | null | undefined,
): number {
  const base = Number.isFinite(baseMaxHealth) ? baseMaxHealth : 100;
  return Math.max(1, Math.round(base + sumEquippedBuff(rows, "health")));
}

/**
 * Current health after max health changes.
 *
 * Unequipping health gear lowers the ceiling, and current health has to come
 * down with it. Raising the ceiling does not heal — the player keeps the health
 * they had, with more room above it.
 */
export function clampCurrentHealth(currentHealth: number, maxHealth: number): number {
  if (!Number.isFinite(currentHealth)) return maxHealth;
  return Math.max(0, Math.min(currentHealth, maxHealth));
}
