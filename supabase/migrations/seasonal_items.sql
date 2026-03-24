-- ============================================================
-- ENERGEIA: SEASONAL ITEMS MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Add is_quest_reward column to items_master
-- ============================================================

ALTER TABLE items_master ADD COLUMN IF NOT EXISTS is_quest_reward BOOLEAN DEFAULT FALSE;


-- ============================================================
-- STEP 2: Tag existing quest reward items
-- (Set season + is_quest_reward = true on all 12 existing rewards)
-- ============================================================

-- MONK STOLES
UPDATE items_master SET season = 'Winter (Dec–Feb)', is_quest_reward = true WHERE id = 'd4e5cf55-0dac-4414-bb62-9ff1f2b96431'; -- Stole of Uncreated Light
UPDATE items_master SET season = 'Spring (Mar–May)', is_quest_reward = true WHERE id = 'd73e37eb-d19c-4288-a767-941817b1ec07'; -- Stole of the Great Fast
UPDATE items_master SET season = 'Summer (Jun–Aug)', is_quest_reward = true WHERE id = '719b06aa-d204-4849-9b1f-d1fd7b427e5b'; -- Stole of the Life-Giver
UPDATE items_master SET season = 'Autumn (Sep–Nov)', is_quest_reward = true WHERE id = '1e63c50b-579f-4ebf-a0ee-998905c962c8'; -- Martyr's Stole

-- FIGHTER SHIELDS
UPDATE items_master SET season = 'Winter (Dec–Feb)', is_quest_reward = true WHERE id = '3d37b018-fe4b-48b4-b55c-c580f0ee6cad'; -- Aegis of the Incarnation
UPDATE items_master SET season = 'Spring (Mar–May)', is_quest_reward = true WHERE id = '5cfd7ab8-b9ee-4f06-8886-6fadb1e204c3'; -- Bulwark of the Cross
UPDATE items_master SET season = 'Summer (Jun–Aug)', is_quest_reward = true WHERE id = '5d365d52-bed6-4584-a92e-0f82e57145d8'; -- Verdant Shield
UPDATE items_master SET season = 'Autumn (Sep–Nov)', is_quest_reward = true WHERE id = 'd88d2d38-ae65-4d6a-baf6-e4cd1f4394d1'; -- Shield of the Steward

-- PRINCESS CROWNS / HEADPIECES
UPDATE items_master SET season = 'Winter (Dec–Feb)', is_quest_reward = true WHERE id = 'dffad2ba-44e1-488c-b56f-3ade637757fb'; -- Diadem of Humility
UPDATE items_master SET season = 'Spring (Mar–May)', is_quest_reward = true WHERE id = 'c13fbafc-b553-48ab-bc7e-de276a51218f'; -- Wreath of Thorns
UPDATE items_master SET season = 'Summer (Jun–Aug)', is_quest_reward = true WHERE id = '7555dfba-fa57-417a-a786-e61833064347'; -- Crown of Tabor
UPDATE items_master SET season = 'Autumn (Sep–Nov)', is_quest_reward = true WHERE id = '85ae447c-3cf3-402a-91ae-3aff7b2b6bd8'; -- Crown of Harvest Gold


-- ============================================================
-- STEP 3: Update existing Princess Spring items
-- (Already exist — just tag them with season)
-- ============================================================

UPDATE items_master SET season = 'Spring (Mar–May)' WHERE id = '337d49bb-4b87-4be0-b4b5-753e6f1ce325'; -- Noble Spring Dress
UPDATE items_master SET season = 'Spring (Mar–May)', is_in_market = true WHERE id = '9b3f37da-ca2d-4b2b-ae12-39dee017f258'; -- Spring Mirror of Vasilisa


-- ============================================================
-- STEP 4: INSERT new items
-- NOTE: 'nobleman' is the class identifier for Male Noble.
--       Update this value to match whatever class key you assign
--       when the Male Noble character is implemented.
-- All image_path values use placeholder — update when art is ready.
-- ============================================================


-- ------------------------------------------------------------
-- MALE NOBLE — QUEST REWARDS (4 items)
-- ------------------------------------------------------------

INSERT INTO items_master (id, name, flavor_text, description, base_energeia_cost, type, image_path, hidden_stat_type, hidden_buff_value, required_class, is_in_market, is_permanent, is_unique, season, is_subscriber_only, is_quest_reward, display_slot) VALUES

(gen_random_uuid(),
 'Derzhava of the Theophany',
 'Carried by the Tsar who walked to the frozen river, and returned with Heaven''s own blessing.',
 'A sovereign orb etched with the rivers of Jordan. Grants +10 Defense.',
 0, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 false, true, true, 'Winter (Dec–Feb)', false, true, null),

(gen_random_uuid(),
 'The Paschal Bulava',
 'Forged in the fires of Holy Saturday. Wielded only by those who endured the long night.',
 'A jeweled ceremonial mace with a Paschal egg head. Grants +10 Defense.',
 0, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 false, true, true, 'Spring (Mar–May)', false, true, null),

(gen_random_uuid(),
 'The Staff of Tabor Light',
 'Cut near the Holy Mountain. It still carries warmth from a Light that had no origin.',
 'A pilgrim''s staff of carved olive wood with a pale gold crown. Grants +10 Energeia.',
 0, 'equippable', 'placeholder', 'energeia', 10, 'nobleman',
 false, true, true, 'Summer (Jun–Aug)', false, true, null),

(gen_random_uuid(),
 'The Vine Scepter of the Dormition',
 'Presented to the noble who kept the feast table pure, when even the angels gathered for the Great Farewell.',
 'A silver scepter wrapped in carved grapevines with a dormition icon set in amber. Grants +10 Health.',
 0, 'equippable', 'placeholder', 'health', 10, 'nobleman',
 false, true, true, 'Autumn (Sep–Nov)', false, true, null);


-- ------------------------------------------------------------
-- MALE NOBLE — PURCHASABLE SEASONAL ITEMS (8 items)
-- ------------------------------------------------------------

INSERT INTO items_master (id, name, flavor_text, description, base_energeia_cost, type, image_path, hidden_stat_type, hidden_buff_value, required_class, is_in_market, is_permanent, is_unique, season, is_subscriber_only, is_quest_reward, display_slot) VALUES

-- WINTER
(gen_random_uuid(),
 'Boyar''s Winter Kaftan',
 'Worn at the Nativity vigil when even the Tsar knelt with the servants.',
 'Midnight blue velvet lined with white ermine and silver star embroidery. Grants +10 Defense.',
 80, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Shapka of the Wise Men',
 'Three kings followed a star. This hat reminds the wearer that true power kneels.',
 'A sable fur-trimmed princely hat with a golden star clasp at the center. Grants +10 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 10, 'nobleman',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

-- SPRING
(gen_random_uuid(),
 'Paschal Dalmatic',
 'Worn when the whole court cried Christos Anesti and the palace blazed with torchlight.',
 'Imperial crimson Byzantine ceremonial tunic with gold cross-patterns. Grants +10 Defense.',
 80, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 true, true, true, 'Spring (Mar–May)', false, false, null),

(gen_random_uuid(),
 'Laurel Crown of the Risen King',
 'The caesar who wore it understood that the greatest empire is built on an empty tomb.',
 'A Byzantine golden laurel wreath set with small red garnets. Grants +10 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 10, 'nobleman',
 true, true, true, 'Spring (Mar–May)', false, false, null),

-- SUMMER
(gen_random_uuid(),
 'White Dalmatic of Tabor',
 'Sewn for the feast when even the fabric seemed to glow from within.',
 'Pure white Byzantine court robes with gold trim. Grants +10 Defense.',
 80, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Diadem of the Holy Apostles',
 'Fashioned to remind the wearer that every apostle who wore authority died for it.',
 'A Byzantine stemma set with pale topaz in the style of the apostolic era. Grants +10 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 10, 'nobleman',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

-- AUTUMN
(gen_random_uuid(),
 'Kievan Prince''s Autumn Mantle',
 'Worn by the princes of Rus who remembered that the harvest belongs first to God.',
 'Deep purple ceremonial mantle with gold brocade and amber leaf embroidery. Grants +10 Defense.',
 80, 'equippable', 'placeholder', 'defense', 10, 'nobleman',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Amber Crown of the Protector',
 'It is heavy enough to remind you what you are protecting.',
 'A golden crown set with Baltic amber stones in the style of early Rus princely crowns. Grants +10 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 10, 'nobleman',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null);


-- ------------------------------------------------------------
-- MONK — PURCHASABLE SEASONAL ITEMS (12 items)
-- ------------------------------------------------------------

INSERT INTO items_master (id, name, flavor_text, description, base_energeia_cost, type, image_path, hidden_stat_type, hidden_buff_value, required_class, is_in_market, is_permanent, is_unique, season, is_subscriber_only, is_quest_reward, display_slot) VALUES

-- WINTER
(gen_random_uuid(),
 'Robes of the Great Blessing',
 'The abbot who wore these walked to the frozen river at midnight and returned with water that healed.',
 'Midnight blue monastic robes with silver wave embroidery at the hem. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'monk',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Theophany Kamilavka',
 'When Christ entered the water, the water became holy. Remember — you too were baptized.',
 'A black kamilavka with a silver band engraved with the Theophany troparion. Grants +3 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 3, 'monk',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Jordan Cross',
 'Dipped in the blessed waters three times. Still cold to the touch.',
 'A silver blessing cross with blue enamel river waves at its base. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'monk',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

-- SPRING
(gen_random_uuid(),
 'Mantia of the Great Fast',
 'Put on in darkness. The gold at the hem is a promise — Pascha comes.',
 'Black velvet monastic mantle with purple cross embroidery and a gold Paschal hem. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'monk',
 true, true, true, 'Spring (Mar–May)', false, false, null),

(gen_random_uuid(),
 'Kamilavka of Holy Week',
 'Worn without ornamentation. The silence of Holy Saturday speaks louder than gold.',
 'A deep black kamilavka with a crown of thorns pattern pressed into the fabric. Grants +3 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 3, 'monk',
 true, true, true, 'Spring (Mar–May)', false, false, null),

(gen_random_uuid(),
 'Encolpion of the Resurrection',
 'Sealed with wax from the Paschal candle. Opens only to prayer.',
 'A golden reliquary cross with a small Resurrection scene on the front. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'monk',
 true, true, true, 'Spring (Mar–May)', false, false, null),

-- SUMMER
(gen_random_uuid(),
 'Robes of the Holy Spirit',
 'Sewn by a blind nun who said she could see the color perfectly in her heart.',
 'Deep forest green monastic robes with gold flame embroidery at the shoulders. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'monk',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Kamilavka of the Apostles',
 'Twelve fishermen changed the world. You can change your corner of it.',
 'A dark green kamilavka with small gold fish symbols embroidered around the band. Grants +3 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 3, 'monk',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Tabor Encolpion',
 'Heavy with light. You only feel the weight when you stop looking up.',
 'A white gold reliquary cross set with pale topaz, engraved with Christ flanked by Moses and Elijah. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'monk',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

-- AUTUMN
(gen_random_uuid(),
 'Mantia of the Dormition',
 'Worn at the vigil when the whole village brought the first fruits to lay at her feet.',
 'Wine-purple monastic mantle with golden vine and wheat patterns at the border. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'monk',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Kamilavka of the Protector',
 'The Cross was exalted in September. This hat bows to it every time you put it on.',
 'A deep purple kamilavka with amber thread forming a cross at the front. Grants +3 Energeia.',
 60, 'equippable', 'placeholder', 'energeia', 3, 'monk',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Cross of the Exaltation',
 'Raised high so all could see. Carried close so you could not forget.',
 'A large dark silver cross with amber inlay, styled after the processional crosses of the Exaltation feast. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'monk',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null);


-- ------------------------------------------------------------
-- FIGHTER — PURCHASABLE SEASONAL ITEMS (12 items)
-- ------------------------------------------------------------

INSERT INTO items_master (id, name, flavor_text, description, base_energeia_cost, type, image_path, hidden_stat_type, hidden_buff_value, required_class, is_in_market, is_permanent, is_unique, season, is_subscriber_only, is_quest_reward, display_slot) VALUES

-- WINTER
(gen_random_uuid(),
 'Varangian Mail',
 'The Norsemen who stood guard at the palace doors bent their knee at Christmas like anyone else.',
 'Heavy chainmail interwoven with silver wire, a Nativity star embossed on the chest plate. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'fighter',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Frost Blade',
 'Forged in January when the water in the quench bucket froze before the blade could cool.',
 'A long iron sword with a wolf fur hilt and ice crystal patterns etched along the fuller. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'fighter',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Helm of the Northern Star',
 'The star guided the Magi. This one guides the warrior home.',
 'An iron nasal helmet with a star-shaped boss at the crown, in the style of early Rus warriors. Grants +3 Defense.',
 60, 'equippable', 'placeholder', 'defense', 3, 'fighter',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

-- SPRING
(gen_random_uuid(),
 'Cataphract Lamellar',
 'The Basileus blessed the army at Pascha before the spring campaign. They did not lose.',
 'Overlapping bronze lamellar armor with Paschal crosses and crimson leather straps. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'fighter',
 true, true, true, 'Spring (Mar–May)', false, false, null),

(gen_random_uuid(),
 'Blade of the Risen Sun',
 'Christos Anesti. And with Him, every righteous cause.',
 'A Byzantine spathion with a sunburst crossguard and Christogram etched on the blade. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'fighter',
 true, true, true, 'Spring (Mar–May)', false, false, null),

(gen_random_uuid(),
 'Tagmata Helm',
 'The plume was dyed on Holy Saturday. The red never faded.',
 'A Byzantine ridge helmet with a crimson horsehair plume and gold cross boss. Grants +3 Defense.',
 60, 'equippable', 'placeholder', 'defense', 3, 'fighter',
 true, true, true, 'Spring (Mar–May)', false, false, null),

-- SUMMER
(gen_random_uuid(),
 'Brigandine of the Apostles',
 'Light enough for the summer march. Heavy enough to remember who you fight for.',
 'Light summer armor of studded leather with gold rivets stamped with apostolic symbols. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'fighter',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Sword of the Transfiguration',
 'Polished so bright it once blinded a man. He said it was the most beautiful thing he had ever seen.',
 'A polished steel blade appearing almost white in sunlight, with a golden crossguard shaped like rays of light. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'fighter',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Helm of the Holy Mount',
 'On the mountain, the disciples fell on their faces. In battle, your enemies will.',
 'A bright polished iron spangenhelm with gold aventail rings, blinding in the summer sun. Grants +3 Defense.',
 60, 'equippable', 'placeholder', 'defense', 3, 'fighter',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

-- AUTUMN
(gen_random_uuid(),
 'Cossack Brigandine',
 'Worn by the hetman who stood between the village and the steppe all autumn long.',
 'Studded leather with amber iron plates and harvest wheat cross patterns. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'fighter',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Saber of the Harvest Guard',
 'The Cossack who carried it swore he''d hang it up when the last grape was pressed. He never did.',
 'A curved Cossack saber with autumn-gold leather grip and grape vine engravings on the blade. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'fighter',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Zaporozhian Helm',
 'The Sich never fell while this was worn. The man inside it was another matter.',
 'A pointed Eastern European iron helm with chainmail aventail and an amber cross boss at the crown. Grants +3 Defense.',
 60, 'equippable', 'placeholder', 'defense', 3, 'fighter',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null);


-- ------------------------------------------------------------
-- PRINCESS — PURCHASABLE SEASONAL ITEMS (6 new items)
-- Spring is already covered by existing Noble Spring Dress + Spring Mirror
-- ------------------------------------------------------------

INSERT INTO items_master (id, name, flavor_text, description, base_energeia_cost, type, image_path, hidden_stat_type, hidden_buff_value, required_class, is_in_market, is_permanent, is_unique, season, is_subscriber_only, is_quest_reward, display_slot) VALUES

-- WINTER
(gen_random_uuid(),
 'Sarafan of the Holy Night',
 'She waited all night at the vigil. When the bells rang, she wept, and no one could say why.',
 'Midnight blue sarafan trimmed with white ermine and silver star embroidery. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'noble',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

(gen_random_uuid(),
 'Nativity Lantern',
 'She who carries light through the dark is herself a kind of light.',
 'A delicate silver filigree lantern carrying a beeswax candle, carried in the palace Nativity procession. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'noble',
 true, true, true, 'Winter (Dec–Feb)', false, false, null),

-- SUMMER
(gen_random_uuid(),
 'Dalmatica of the Holy Spirit',
 'She wore it only once. The choir sang so beautifully that three people fainted. She was not one of them.',
 'White Byzantine court dress with gold flame embroidery at the hem and cuffs. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'noble',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

(gen_random_uuid(),
 'Golden Fan of Theodora',
 'She used it to fan the Paschal candles back to life when the wind came through the nave.',
 'A folding golden fan painted with the Holy Spirit as a dove and twelve apostolic flames. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'noble',
 true, true, true, 'Summer (Jun–Aug)', false, false, null),

-- AUTUMN
(gen_random_uuid(),
 'Mantle of the Dormition',
 'The princess who wore it gave the first grain of the harvest to the Church before her own table was set.',
 'Amber-gold court mantle over wine-purple robes with vineyard patterns in the Kievan Rus tradition. Grants +5 Defense.',
 80, 'equippable', 'placeholder', 'defense', 5, 'noble',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null),

(gen_random_uuid(),
 'Amber Scepter of the Theotokos',
 'She who carried it understood that every queen serves a higher Queen.',
 'An ivory and amber scepter topped with a carved Theotokos, carried at the Dormition procession. Grants +5 Energeia.',
 70, 'equippable', 'placeholder', 'energeia', 5, 'noble',
 true, true, true, 'Autumn (Sep–Nov)', false, false, null);


-- ============================================================
-- DONE.
-- Next steps after running this migration:
-- 1. Update image_path values when art is ready
-- 2. Update 'nobleman' class key to match actual class identifier
--    when Male Noble character is implemented
-- 3. Update quest completion code to award class-specific
--    quest reward items based on season + is_quest_reward + required_class
-- ============================================================
