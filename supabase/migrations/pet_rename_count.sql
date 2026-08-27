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


-- Existing pets: before this feature, the ONLY thing that ever wrote
-- pet_name was the rename handler in stable.tsx. Adoption did not set
-- it. So for legacy rows, a non-null pet_name means the player renamed
-- the animal at least once — no inference required.
--
-- Deliberately NOT comparing pet_name against default_pet_name. That
-- comparison is the same unsound shortcut the feature itself avoids: a
-- player who renamed a pet and then renamed it back to its default
-- would read as never having renamed, and would be handed a second
-- free change. It also breaks on animals whose default_pet_name is
-- null, where the app falls back to the item name.
UPDATE user_inventory ui
SET pet_rename_count = 1
FROM items_master im
WHERE im.id = ui.item_master_id
  AND im.type = 'animal'
  AND ui.pet_name IS NOT NULL
  AND ui.pet_rename_count = 0;


-- Backfill the name itself for animals adopted before this shipped, so
-- every pet has a real stored name rather than relying on the display
-- falling back to the item default.
--
-- COALESCE mirrors the app: defaultPetName is `default_pet_name ?? name`,
-- and nothing currently populates default_pet_name, so without the
-- fallback this would write nothing at all for most animals.
UPDATE user_inventory ui
SET pet_name = COALESCE(im.default_pet_name, im.name)
FROM items_master im
WHERE im.id = ui.item_master_id
  AND im.type = 'animal'
  AND ui.pet_name IS NULL
  AND COALESCE(im.default_pet_name, im.name) IS NOT NULL;


-- Check what the backfill did:
--
--   SELECT im.name, ui.pet_name, im.default_pet_name, ui.pet_rename_count
--   FROM user_inventory ui
--   JOIN items_master im ON im.id = ui.item_master_id
--   WHERE im.type = 'animal'
--   ORDER BY ui.pet_rename_count DESC;
