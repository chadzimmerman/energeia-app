-- ============================================================
-- ENERGEIA: Separate level-earned health from gear health (#14)
--
-- max_health used to be a single stored number nudged from two
-- places: level-up added 5 + equipped gear, and equipping or
-- unequipping added or subtracted the item's bonus.
--
-- Because it was only ever adjusted incrementally, any path that
-- changed what was equipped without also adjusting max_health left
-- the number permanently wrong. ProfileContext's auto-unequip of
-- class-mismatched gear was exactly such a path.
--
-- Splitting the value fixes the whole class of problem:
--
--   base_max_health  what the player earned by levelling
--   max_health       base_max_health + currently equipped gear
--
-- max_health stays stored so existing reads keep working, but it is
-- now derived — recalculated on profile load rather than nudged.
--
-- Run this BEFORE deploying the app change.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS base_max_health integer NOT NULL DEFAULT 100;


-- Put every existing row on a consistent footing: base is whatever is
-- left once currently equipped health gear is taken out of max_health.
-- The next profile load re-derives max_health from it, so nothing
-- visibly changes.
UPDATE profiles p
SET base_max_health = GREATEST(
  100,
  p.max_health - COALESCE((
    SELECT sum(im.hidden_buff_value)
    FROM user_inventory ui
    JOIN items_master im ON im.id = ui.item_master_id
    WHERE ui.user_id = p.id
      AND ui.is_equipped = true
      AND im.hidden_stat_type = 'health'
  ), 0)
);


-- Check it landed. Every row should show drift = 0.
--
--   SELECT p.id, p.max_health, p.base_max_health,
--          p.max_health - p.base_max_health - COALESCE((
--            SELECT sum(im.hidden_buff_value)
--            FROM user_inventory ui
--            JOIN items_master im ON im.id = ui.item_master_id
--            WHERE ui.user_id = p.id
--              AND ui.is_equipped = true
--              AND im.hidden_stat_type = 'health'
--          ), 0) AS drift
--   FROM profiles p
--   ORDER BY drift <> 0 DESC;
