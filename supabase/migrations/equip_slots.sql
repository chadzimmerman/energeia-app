-- ============================================================
-- ENERGEIA: Equip Slot Migration
-- Sets display_slot on all character equippable items so the
-- app knows render order and can enforce one-per-slot.
--
-- Slots:
--   character_body   → robes, stoles, dresses, kaftans   (renders first/behind)
--   character_neck   → pectoral cross, necklaces
--   character_hand   → swords, staves, mirrors, scepters
--   character_shield → shields, orbs, offhand items
--   character_head   → hats, helmets, crowns, tiaras     (renders last/on top)
-- ============================================================

-- ── HEADS ──────────────────────────────────────────────────────────────────
UPDATE items_master SET display_slot = 'character_head'
WHERE name ILIKE ANY (ARRAY[
  '%hat%', '%helm%', '%helmet%', '%crown%', '%tiara%',
  '%kokoshnik%', '%diadem%', '%wreath%', '%shapka%', '%schema hat%'
])
AND type = 'equippable';

-- ── BODIES ─────────────────────────────────────────────────────────────────
UPDATE items_master SET display_slot = 'character_body'
WHERE name ILIKE ANY (ARRAY[
  '%robe%', '%stole%', '%dress%', '%kaftan%', '%schema%',
  '%vestment%', '%mantle%', '%tunic%'
])
AND type = 'equippable'
AND (display_slot IS NULL OR display_slot NOT ILIKE 'character_%');

-- ── NECK ───────────────────────────────────────────────────────────────────
UPDATE items_master SET display_slot = 'character_neck'
WHERE name ILIKE ANY (ARRAY[
  '%cross%', '%pectoral%', '%necklace%', '%chotki%', '%medallion%'
])
AND type = 'equippable';

-- ── HANDS (weapons / held items) ───────────────────────────────────────────
UPDATE items_master SET display_slot = 'character_hand'
WHERE name ILIKE ANY (ARRAY[
  '%sword%', '%staff%', '%scepter%', '%bulava%', '%mirror%',
  '%mace%', '%spear%', '%axe%'
])
AND type = 'equippable';

-- ── SHIELDS / OFFHAND ──────────────────────────────────────────────────────
UPDATE items_master SET display_slot = 'character_shield'
WHERE name ILIKE ANY (ARRAY[
  '%shield%', '%aegis%', '%bulwark%', '%orb%', '%derzhava%'
])
AND type = 'equippable';

-- ── KNOWN ITEM IDs (belt-and-suspenders for items whose names don't match) ─
UPDATE items_master SET display_slot = 'character_body'   WHERE id = 'b4fd6529-39cd-48f9-9baa-111f4487d9a4'; -- great-schema-robes
UPDATE items_master SET display_slot = 'character_hand'   WHERE id = '9cca09c7-ba18-49b9-93cb-b4dce413159f'; -- sword
UPDATE items_master SET display_slot = 'character_head'   WHERE id = '2301f7f7-c2fc-4a20-be2a-6b6c843de4b9'; -- warrior-helmet
UPDATE items_master SET display_slot = 'character_shield' WHERE id = 'c3a1450e-46f3-4a88-8b1e-8d31f2086f80'; -- shield

-- Verify: check any equippable items still missing a slot
-- SELECT id, name, display_slot FROM items_master WHERE type = 'equippable' AND (display_slot IS NULL OR display_slot NOT ILIKE 'character_%') ORDER BY name;
