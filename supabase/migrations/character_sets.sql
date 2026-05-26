-- ============================================================
-- ENERGEIA: Character Set Items Migration
-- Full-character-replacement images sold in the market as
-- progressive season sets and base class progressions.
--
-- New columns on items_master:
--   set_group TEXT               groups all stages of one set
--                                e.g. 'fighter-boy-spring'
--   stage_order INT              purchase order within the group (1 = first)
--   gender TEXT                  'male' | 'female' | NULL
--   is_base_class BOOLEAN        TRUE for monk/nun class progression items
--   prerequisite_set_group TEXT  fully complete this set_group first
--                                (used for monk/nun seasonal → base class gate)
--
-- display_slot = 'character_set' means the item replaces the
-- entire base character image rather than layering as an overlay.
--
-- Prices are placeholders — adjust before launch.
-- ============================================================

ALTER TABLE items_master ADD COLUMN IF NOT EXISTS set_group              TEXT;
ALTER TABLE items_master ADD COLUMN IF NOT EXISTS stage_order            INT;
ALTER TABLE items_master ADD COLUMN IF NOT EXISTS gender                 TEXT;
ALTER TABLE items_master ADD COLUMN IF NOT EXISTS is_base_class          BOOLEAN DEFAULT FALSE;
ALTER TABLE items_master ADD COLUMN IF NOT EXISTS prerequisite_set_group TEXT;


-- ── FIGHTER BOY ──────────────────────────────────────────────────────────────
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Fighter Spring Armor',          'equippable', 'character_set', 'fighter-boy-spring-1', 100, 'fighter', 'male', 'fighter-boy-spring', 1, FALSE, 'spring'),
  ('Fighter Spring Armor & Hat',    'equippable', 'character_set', 'fighter-boy-spring-2', 150, 'fighter', 'male', 'fighter-boy-spring', 2, FALSE, 'spring');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Fighter Summer Armor',          'equippable', 'character_set', 'fighter-boy-summer-1', 100, 'fighter', 'male', 'fighter-boy-summer', 1, FALSE, 'summer'),
  ('Fighter Summer Armor & Helmet', 'equippable', 'character_set', 'fighter-boy-summer-2', 150, 'fighter', 'male', 'fighter-boy-summer', 2, FALSE, 'summer');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Fighter Autumn Chainmail',          'equippable', 'character_set', 'fighter-boy-autumn-1', 100, 'fighter', 'male', 'fighter-boy-autumn', 1, FALSE, 'autumn'),
  ('Fighter Autumn Chainmail & Hat',    'equippable', 'character_set', 'fighter-boy-autumn-2', 150, 'fighter', 'male', 'fighter-boy-autumn', 2, FALSE, 'autumn'),
  ('Fighter Autumn Full Chainmail',     'equippable', 'character_set', 'fighter-boy-autumn-3', 200, 'fighter', 'male', 'fighter-boy-autumn', 3, FALSE, 'autumn');

-- Winter
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Fighter Winter Armor',         'equippable', 'character_set', 'fighter-boy-winter-1', 100, 'fighter', 'male', 'fighter-boy-winter', 1, FALSE, 'winter'),
  ('Fighter Winter Armor & Hat',   'equippable', 'character_set', 'fighter-boy-winter-2', 150, 'fighter', 'male', 'fighter-boy-winter', 2, FALSE, 'winter');


-- ── WARRIOR GIRL ─────────────────────────────────────────────────────────────
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Warrior Spring Dress',         'equippable', 'character_set', 'warrior-girl-spring-1', 100, 'fighter', 'female', 'warrior-girl-spring', 1, FALSE, 'spring'),
  ('Warrior Spring Dress & Hat',   'equippable', 'character_set', 'warrior-girl-spring-2', 150, 'fighter', 'female', 'warrior-girl-spring', 2, FALSE, 'spring');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Warrior Summer Armor',         'equippable', 'character_set', 'warrior-girl-summer-1', 100, 'fighter', 'female', 'warrior-girl-summer', 1, FALSE, 'summer'),
  ('Warrior Summer Helmet',        'equippable', 'character_set', 'warrior-girl-summer-2', 150, 'fighter', 'female', 'warrior-girl-summer', 2, FALSE, 'summer'),
  ('Warrior Summer Full Armor',    'equippable', 'character_set', 'warrior-girl-summer-3', 200, 'fighter', 'female', 'warrior-girl-summer', 3, FALSE, 'summer');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Warrior Autumn Armor',         'equippable', 'character_set', 'warrior-girl-autumn-1', 100, 'fighter', 'female', 'warrior-girl-autumn', 1, FALSE, 'autumn'),
  ('Warrior Autumn Armor & Hat',   'equippable', 'character_set', 'warrior-girl-autumn-2', 150, 'fighter', 'female', 'warrior-girl-autumn', 2, FALSE, 'autumn');

-- Winter (Strelec)
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Strelec Winter Armor',         'equippable', 'character_set', 'warrior-girl-winter-1', 100, 'fighter', 'female', 'warrior-girl-winter', 1, FALSE, 'winter'),
  ('Strelec Winter Armor & Hat',   'equippable', 'character_set', 'warrior-girl-winter-2', 150, 'fighter', 'female', 'warrior-girl-winter', 2, FALSE, 'winter'),
  ('Strelec Winter Full Kit',      'equippable', 'character_set', 'warrior-girl-winter-3', 200, 'fighter', 'female', 'warrior-girl-winter', 3, FALSE, 'winter');


-- ── NOBLE BOY ─────────────────────────────────────────────────────────────────
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Spring Robes',           'equippable', 'character_set', 'noble-boy-spring-1', 100, 'noble', 'male', 'noble-boy-spring', 1, FALSE, 'spring'),
  ('Noble Spring Robes & Hat',     'equippable', 'character_set', 'noble-boy-spring-2', 150, 'noble', 'male', 'noble-boy-spring', 2, FALSE, 'spring');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Summer Robes',           'equippable', 'character_set', 'noble-boy-summer-1', 100, 'noble', 'male', 'noble-boy-summer', 1, FALSE, 'summer'),
  ('Noble Summer Robes & Hat',     'equippable', 'character_set', 'noble-boy-summer-2', 150, 'noble', 'male', 'noble-boy-summer', 2, FALSE, 'summer');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Autumn Robes',           'equippable', 'character_set', 'noble-boy-autumn-1', 100, 'noble', 'male', 'noble-boy-autumn', 1, FALSE, 'autumn'),
  ('Noble Autumn Robes & Hat',     'equippable', 'character_set', 'noble-boy-autumn-2', 150, 'noble', 'male', 'noble-boy-autumn', 2, FALSE, 'autumn');

-- Winter
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Winter Robes',           'equippable', 'character_set', 'noble-boy-winter-1', 100, 'noble', 'male', 'noble-boy-winter', 1, FALSE, 'winter'),
  ('Noble Winter Robes & Hat',     'equippable', 'character_set', 'noble-boy-winter-2', 150, 'noble', 'male', 'noble-boy-winter', 2, FALSE, 'winter'),
  ('Noble Winter Cloak & Hat',     'equippable', 'character_set', 'noble-boy-winter-3', 200, 'noble', 'male', 'noble-boy-winter', 3, FALSE, 'winter');


-- ── NOBLE GIRL ────────────────────────────────────────────────────────────────
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Lady Spring Dress',          'equippable', 'character_set', 'noble-girl-spring-1', 100, 'noble', 'female', 'noble-girl-spring', 1, FALSE, 'spring'),
  ('Noble Lady Spring Dress & Hat',    'equippable', 'character_set', 'noble-girl-spring-2', 150, 'noble', 'female', 'noble-girl-spring', 2, FALSE, 'spring');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Lady Summer Dress',          'equippable', 'character_set', 'noble-girl-summer-1', 100, 'noble', 'female', 'noble-girl-summer', 1, FALSE, 'summer'),
  ('Noble Lady Summer Dress & Hat',    'equippable', 'character_set', 'noble-girl-summer-2', 150, 'noble', 'female', 'noble-girl-summer', 2, FALSE, 'summer');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Lady Autumn Dress',          'equippable', 'character_set', 'noble-girl-autumn-1', 100, 'noble', 'female', 'noble-girl-autumn', 1, FALSE, 'autumn'),
  ('Noble Lady Autumn Dress & Hat',    'equippable', 'character_set', 'noble-girl-autumn-2', 150, 'noble', 'female', 'noble-girl-autumn', 2, FALSE, 'autumn');

-- Winter
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Noble Lady Winter Dress',          'equippable', 'character_set', 'noble-girl-winter-1', 100, 'noble', 'female', 'noble-girl-winter', 1, FALSE, 'winter'),
  ('Noble Lady Winter Dress & Hat',    'equippable', 'character_set', 'noble-girl-winter-2', 150, 'noble', 'female', 'noble-girl-winter', 2, FALSE, 'winter');


-- ── MONK GUY — BASE CLASS ────────────────────────────────────────────────────
-- Must own stage N-1 before buying stage N.
-- Seasonal monk items require this entire set to be completed first.
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Novice Monk with Cross',           'equippable', 'character_set', 'monk-guy-base-1', 50,  'monk', 'male', 'monk-guy-base', 1, TRUE, NULL),
  ('Novice Monk with Hat',             'equippable', 'character_set', 'monk-guy-base-2', 50,  'monk', 'male', 'monk-guy-base', 2, TRUE, NULL),
  ('Novice Monk with Hat & Cross',     'equippable', 'character_set', 'monk-guy-base-3', 50,  'monk', 'male', 'monk-guy-base', 3, TRUE, NULL),
  ('Monk in Klobuk',                   'equippable', 'character_set', 'monk-guy-base-4', 75,  'monk', 'male', 'monk-guy-base', 4, TRUE, NULL),
  ('Monk in Klobuk & Cross',           'equippable', 'character_set', 'monk-guy-base-5', 75,  'monk', 'male', 'monk-guy-base', 5, TRUE, NULL),
  ('Monk in Service Dress',            'equippable', 'character_set', 'monk-guy-base-6', 100, 'monk', 'male', 'monk-guy-base', 6, TRUE, NULL),
  ('Monk in Full Service Dress',       'equippable', 'character_set', 'monk-guy-base-7', 100, 'monk', 'male', 'monk-guy-base', 7, TRUE, NULL);

-- ── MONK GUY — SEASONAL ──────────────────────────────────────────────────────
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Monk Spring Robes',                'equippable', 'character_set', 'monk-guy-spring-1', 125, 'monk', 'male', 'monk-guy-spring', 1, FALSE, 'spring', 'monk-guy-base'),
  ('Monk Spring Robes & Cross',        'equippable', 'character_set', 'monk-guy-spring-2', 175, 'monk', 'male', 'monk-guy-spring', 2, FALSE, 'spring', 'monk-guy-base');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Monk Summer Robes',                'equippable', 'character_set', 'monk-guy-summer-1', 125, 'monk', 'male', 'monk-guy-summer', 1, FALSE, 'summer', 'monk-guy-base'),
  ('Monk Summer Robes & Cross',        'equippable', 'character_set', 'monk-guy-summer-2', 175, 'monk', 'male', 'monk-guy-summer', 2, FALSE, 'summer', 'monk-guy-base');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Monk Autumn Robes',                'equippable', 'character_set', 'monk-guy-autumn-1', 125, 'monk', 'male', 'monk-guy-autumn', 1, FALSE, 'autumn', 'monk-guy-base'),
  ('Monk Autumn Robes & Cross',        'equippable', 'character_set', 'monk-guy-autumn-2', 175, 'monk', 'male', 'monk-guy-autumn', 2, FALSE, 'autumn', 'monk-guy-base');

-- Winter
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Monk Winter Robes',                'equippable', 'character_set', 'monk-guy-winter-1', 125, 'monk', 'male', 'monk-guy-winter', 1, FALSE, 'winter', 'monk-guy-base'),
  ('Monk Winter Robes & Cross',        'equippable', 'character_set', 'monk-guy-winter-2', 175, 'monk', 'male', 'monk-guy-winter', 2, FALSE, 'winter', 'monk-guy-base'),
  ('Monk Winter Robes & Hat',          'equippable', 'character_set', 'monk-guy-winter-3', 225, 'monk', 'male', 'monk-guy-winter', 3, FALSE, 'winter', 'monk-guy-base'),
  ('Monk Winter Full Vestments',       'equippable', 'character_set', 'monk-guy-winter-4', 275, 'monk', 'male', 'monk-guy-winter', 4, FALSE, 'winter', 'monk-guy-base');


-- ── NUN GIRL — BASE CLASS ────────────────────────────────────────────────────
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season) VALUES
  ('Novice Nun with Cross',            'equippable', 'character_set', 'nun-girl-base-1', 50, 'monk', 'female', 'nun-girl-base', 1, TRUE, NULL),
  ('Novice Nun with Hat',              'equippable', 'character_set', 'nun-girl-base-2', 50, 'monk', 'female', 'nun-girl-base', 2, TRUE, NULL),
  ('Nun with Hat & Cross',             'equippable', 'character_set', 'nun-girl-base-3', 75, 'monk', 'female', 'nun-girl-base', 3, TRUE, NULL);

-- ── NUN GIRL — SEASONAL ──────────────────────────────────────────────────────
-- Stage order per season: robes only → cross no hat → hat no cross → hat and cross
-- Spring
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Nun Spring Robes',                 'equippable', 'character_set', 'nun-girl-spring-1', 125, 'monk', 'female', 'nun-girl-spring', 1, FALSE, 'spring', 'nun-girl-base'),
  ('Nun Spring Robes & Cross',         'equippable', 'character_set', 'nun-girl-spring-2', 175, 'monk', 'female', 'nun-girl-spring', 2, FALSE, 'spring', 'nun-girl-base'),
  ('Nun Spring Robes & Hat',           'equippable', 'character_set', 'nun-girl-spring-3', 225, 'monk', 'female', 'nun-girl-spring', 3, FALSE, 'spring', 'nun-girl-base'),
  ('Nun Spring Full Vestments',        'equippable', 'character_set', 'nun-girl-spring-4', 275, 'monk', 'female', 'nun-girl-spring', 4, FALSE, 'spring', 'nun-girl-base');

-- Summer
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Nun Summer Robes',                 'equippable', 'character_set', 'nun-girl-summer-1', 125, 'monk', 'female', 'nun-girl-summer', 1, FALSE, 'summer', 'nun-girl-base'),
  ('Nun Summer Robes & Cross',         'equippable', 'character_set', 'nun-girl-summer-2', 175, 'monk', 'female', 'nun-girl-summer', 2, FALSE, 'summer', 'nun-girl-base'),
  ('Nun Summer Robes & Hat',           'equippable', 'character_set', 'nun-girl-summer-3', 225, 'monk', 'female', 'nun-girl-summer', 3, FALSE, 'summer', 'nun-girl-base'),
  ('Nun Summer Full Vestments',        'equippable', 'character_set', 'nun-girl-summer-4', 275, 'monk', 'female', 'nun-girl-summer', 4, FALSE, 'summer', 'nun-girl-base');

-- Autumn
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Nun Autumn Robes',                 'equippable', 'character_set', 'nun-girl-autumn-1', 125, 'monk', 'female', 'nun-girl-autumn', 1, FALSE, 'autumn', 'nun-girl-base'),
  ('Nun Autumn Robes & Cross',         'equippable', 'character_set', 'nun-girl-autumn-2', 175, 'monk', 'female', 'nun-girl-autumn', 2, FALSE, 'autumn', 'nun-girl-base'),
  ('Nun Autumn Robes & Hat',           'equippable', 'character_set', 'nun-girl-autumn-3', 225, 'monk', 'female', 'nun-girl-autumn', 3, FALSE, 'autumn', 'nun-girl-base'),
  ('Nun Autumn Full Vestments',        'equippable', 'character_set', 'nun-girl-autumn-4', 275, 'monk', 'female', 'nun-girl-autumn', 4, FALSE, 'autumn', 'nun-girl-base');

-- Winter
INSERT INTO items_master (name, type, display_slot, image_path, base_energeia_cost, required_class, gender, set_group, stage_order, is_base_class, season, prerequisite_set_group) VALUES
  ('Nun Winter Robes',                 'equippable', 'character_set', 'nun-girl-winter-1', 125, 'monk', 'female', 'nun-girl-winter', 1, FALSE, 'winter', 'nun-girl-base'),
  ('Nun Winter Robes & Cross',         'equippable', 'character_set', 'nun-girl-winter-2', 175, 'monk', 'female', 'nun-girl-winter', 2, FALSE, 'winter', 'nun-girl-base'),
  ('Nun Winter Robes & Hat',           'equippable', 'character_set', 'nun-girl-winter-3', 225, 'monk', 'female', 'nun-girl-winter', 3, FALSE, 'winter', 'nun-girl-base'),
  ('Nun Winter Full Vestments',        'equippable', 'character_set', 'nun-girl-winter-4', 275, 'monk', 'female', 'nun-girl-winter', 4, FALSE, 'winter', 'nun-girl-base');


-- ── VERIFY ───────────────────────────────────────────────────────────────────
-- Run this after applying to confirm all rows landed correctly:
-- SELECT required_class, gender, set_group, stage_order, name, image_path
-- FROM items_master
-- WHERE display_slot = 'character_set'
-- ORDER BY required_class, gender, is_base_class DESC, set_group, stage_order;
