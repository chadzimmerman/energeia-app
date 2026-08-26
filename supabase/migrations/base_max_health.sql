-- ============================================================
-- ENERGEIA: Separate level-earned health from gear health (#14)
--
-- max_health is currently a single stored number mutated from two
-- places: level-up adds 5 + equipped health bonus, and equipping or
-- unequipping adds or subtracts the item's bonus.
--
-- Because it is only ever adjusted incrementally, any path that
-- changes what is equipped without also adjusting max_health leaves
-- the number permanently wrong. There is at least one such path:
-- ProfileContext auto-unequips items that no longer match the
-- player's class or gender and does not touch max_health, so that
-- bonus is kept forever.
--
-- Splitting the value fixes the whole class of problem instead of
-- one path at a time:
--
--   base_max_health  what the player earned by levelling
--   max_health       base_max_health + currently equipped health gear
--
-- max_health stays stored so existing reads keep working, but it
-- becomes derived — recalculated on profile load rather than nudged.
--
-- Run this BEFORE deploying the app change.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS base_max_health integer NOT NULL DEFAULT 100;


-- Backfill: work backwards from the value players have now, so nobody
-- gains or loses health when the app change ships. Whatever gear is
-- equipped right now is treated as the gear half; the rest is base.
--
-- GREATEST(100, ...) guards the case where drift has already pushed
-- max_health below the starting value.
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


-- Sanity check — run after the UPDATE. Every row should come back
-- with drift = 0. Rows that do not are ones where max_health had
-- already drifted below 100 and were clamped; they are expected and
-- should be few.
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
--   ORDER BY drift <> 0 DESC, drift DESC;
