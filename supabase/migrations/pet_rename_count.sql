-- ============================================================
-- ENERGEIA: Pet naming (#12)
--
-- Animals get a default name when adopted, the player can change
-- it once for free, and any rename after that is subscriber-only.
--
-- Two pieces of state are needed:
--   pet_name           already exists — the animal's current name
--   pet_rename_count   new — how many times the player has changed it
--
-- The count is what the free-once rule reads. Comparing pet_name
-- against default_pet_name would not work: a player who renames an
-- animal back to its default would silently get another free change.
-- ============================================================

ALTER TABLE user_inventory
  ADD COLUMN IF NOT EXISTS pet_rename_count integer NOT NULL DEFAULT 0;


-- Existing pets: anyone already carrying a name different from their
-- item's default has used their free rename, so record that. Everyone
-- else keeps 0 and still has theirs.
--
-- Rows where pet_name is null have never been named at all; the app
-- now writes the default name at adoption, and the display already
-- falls back to it, so they are left at 0.
UPDATE user_inventory ui
SET pet_rename_count = 1
FROM items_master im
WHERE im.id = ui.item_master_id
  AND im.type = 'animal'
  AND ui.pet_name IS NOT NULL
  AND ui.pet_name IS DISTINCT FROM im.default_pet_name
  AND ui.pet_rename_count = 0;


-- Backfill the name itself for animals adopted before this shipped, so
-- every pet has a real stored name rather than relying on the display
-- falling back to the item default.
UPDATE user_inventory ui
SET pet_name = im.default_pet_name
FROM items_master im
WHERE im.id = ui.item_master_id
  AND im.type = 'animal'
  AND ui.pet_name IS NULL
  AND im.default_pet_name IS NOT NULL;


-- Check what the backfill did:
--
--   SELECT im.name, ui.pet_name, im.default_pet_name, ui.pet_rename_count
--   FROM user_inventory ui
--   JOIN items_master im ON im.id = ui.item_master_id
--   WHERE im.type = 'animal'
--   ORDER BY ui.pet_rename_count DESC;
