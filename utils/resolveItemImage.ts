import { ImageSourcePropType } from "react-native";

// ── Local item image map ──────────────────────────────────────────────────────
// Store the image_path DB key as the record key (no extension).
// Metro requires static require() paths — add new items here as art arrives.
 
const PLACEHOLDER = require("../assets/sprites/items/item-placeholder.png");

const ITEM_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  // ── Existing items (bundled locally for faster loading) ───────────────────
  "bone-relic":         require("../assets/sprites/items/bone-relic.png"),
  candle:               require("../assets/sprites/items/candle.png"),
  chotki:               require("../assets/sprites/items/chotki.png"),
  "great-schema-robes": require("../assets/sprites/items/great-schema-robes.png"),
  incense:              require("../assets/sprites/items/incense.png"),
  philokalia:           require("../assets/sprites/items/philokalia.png"),
  "prosphora-bread":    require("../assets/sprites/items/prosphora-bread.jpg"),
  "relic-skull":        require("../assets/sprites/items/relic-skull.png"),
  shield:               require("../assets/sprites/items/shield.png"),
  sword:                require("../assets/sprites/items/sword.png"),
  "warrior-helmet":     require("../assets/sprites/items/warrior-helmet.png"),

  // ── Noble female items ────────────────────────────────────────────────────
  "noble-female-tiara":    require("../assets/sprites/items/noble-female-tiara.png"),
  "noble-princess-mirror": require("../assets/sprites/items/noble-princess-mirror.png"),

  // ── Animal companions ─────────────────────────────────────────────────────
  "hen":      require("../assets/sprites/animals/new_animals/hen.png"),
  "bear_cub": require("../assets/sprites/animals/new_animals/bear_cub.png"),
  "bunny":    require("../assets/sprites/animals/new_animals/bunny.png"),
  "calf":     require("../assets/sprites/animals/new_animals/calf.png"),
  "duckling": require("../assets/sprites/animals/new_animals/duckling.png"),
  "goat_kid": require("../assets/sprites/animals/new_animals/goat_kid.png"),
  "hedgehog": require("../assets/sprites/animals/new_animals/hedgehog.png"),
  "kitten":   require("../assets/sprites/animals/new_animals/kitten.png"),
  "lamb":     require("../assets/sprites/animals/new_animals/lamb.png"),
  "mouse":    require("../assets/sprites/animals/new_animals/mouse.png"),
  "pig":      require("../assets/sprites/animals/new_animals/pig.png"),
  "pony":     require("../assets/sprites/animals/new_animals/pony.png"),
  "puppy":    require("../assets/sprites/animals/new_animals/puppy.png"),
  "squirrel": require("../assets/sprites/animals/new_animals/squirrel.png"),

  // ── Equipment overlays (transparent PNGs, layered over character) ────────
  "monk-hat":              require("../assets/sprites/characters/monk/monk-hat.png"),
  "monk-pectoral-cross":   require("../assets/sprites/characters/monk/monk-pectoral-cross.png"),
  "monk-robes":            require("../assets/sprites/characters/monk/monk-robes.png"),
  "princess-kokoshnik":    require("../assets/sprites/characters/princess/princess-kokoshnik.png"),
  "princess-dress":        require("../assets/sprites/characters/princess/princess-dress.png"),
  "spring-2026-mirror":    require("../assets/sprites/characters/princess/spring-2026-mirrior.png"),
  "fighter-helmet":        require("../assets/sprites/characters/warrior/fighter-helmet.png"),
  "fighter-sword":         require("../assets/sprites/characters/warrior/fighter-sword.png"),

  // ── Quest items (scrolls, drops) ─────────────────────────────────────────
  "help-wanted-scroll": require("../assets/sprites/quests/quest-scroll-temp.jpg"),

  // ── Spring 2026 seasonal items ────────────────────────────────────────────
  "spring-kokoshnik-2026":    require("../assets/sprites/items/spring-kokoshnik-2026.png"),
  "temp-princess-spring-dress": require("../assets/sprites/items/temp-princess-spring-dress.png"),
   
  "temp-spring-monk-stole":   require("../assets/sprites/items/temp-spring-20266-monk-Stole-of-the Life-Giver.png"),
  "temp-spring-shield-2026":  require("../assets/sprites/items/temp-spring-shield-2026.png"),
};

/**
 * Resolves an item image_path key to the correct local asset.
 * Falls back to remote URI for existing Supabase Storage URLs.
 */
export const resolveItemImage = (path: string | null | undefined): ImageSourcePropType => {
  if (!path) return PLACEHOLDER;
  if (path.startsWith("http")) return { uri: path };
  return ITEM_IMAGE_MAP[path] ?? PLACEHOLDER;
};

// ── Character set images ───────────────────────────────────────────────────────
// display_slot = 'character_set' items replace the entire base character sprite.
// Keys match image_path in items_master exactly (seeded in character_sets.sql).
// Metro requires static require() calls — all paths must be string literals here.
const CHARACTER_SET_MAP: Record<string, ImageSourcePropType> = {
  // ── FIGHTER BOY ─────────────────────────────────────────────────────────
  "fighter-boy-spring-1": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter spring skin 1 armor.png"),
  "fighter-boy-spring-2": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter spring skin 2 hat.png"),
  "fighter-boy-summer-1": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter summer skin 1 armor.png"),
  "fighter-boy-summer-2": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter summer skin 2 armor and helmet.png"),
  "fighter-boy-autumn-1": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter autumn skin base armor.png"),
  "fighter-boy-autumn-2": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter autumn skin 1 chainmail hat.png"),
  "fighter-boy-autumn-3": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter autumn skin 2 chainmail hat and helmet.png"),
  "fighter-boy-winter-1": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter winter skin armor.png"),
  "fighter-boy-winter-2": require("../assets/sprites/characters/characters_final/fighter boy/boy fighter winter skin armor and hat.png"),

  // ── WARRIOR GIRL ────────────────────────────────────────────────────────
  // spring-2 uses the dress variant (spring 3); spring 2 "in pants" is skipped
  "warrior-girl-spring-1": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl spring 1 no hat in dress.png"),
  "warrior-girl-spring-2": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl spring 3 in hat in dress.png"),
  "warrior-girl-summer-1": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl summer 1 no helmet no armor.png"),
  "warrior-girl-summer-2": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl summer 2 helmet no armor.png"),
  "warrior-girl-summer-3": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl summer helmet and armor.png"),
  "warrior-girl-autumn-1": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl autumn 1 armor no hat.png"),
  "warrior-girl-autumn-2": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl autumn armor and hat.png"),
  "warrior-girl-winter-1": require("../assets/sprites/characters/characters_final/warrior girl/strelec girl winter no gun 1 no hat no gun.png"),
  "warrior-girl-winter-2": require("../assets/sprites/characters/characters_final/warrior girl/strelec girl winter no gun with hat.png"),
  "warrior-girl-winter-3": require("../assets/sprites/characters/characters_final/warrior girl/strelec girl winter with gun and hat.png"),

  // ── NOBLE BOY ───────────────────────────────────────────────────────────
  "noble-boy-spring-1": require("../assets/sprites/characters/characters_final/noble boy/noble boy spring.png"),
  "noble-boy-spring-2": require("../assets/sprites/characters/characters_final/noble boy/noble boy spring 1 with hat.png"),
  "noble-boy-summer-1": require("../assets/sprites/characters/characters_final/noble boy/noble boy summer.png"),
  "noble-boy-summer-2": require("../assets/sprites/characters/characters_final/noble boy/noble boy summer 1 with hat.png"),
  "noble-boy-autumn-1": require("../assets/sprites/characters/characters_final/noble boy/noble boy autumn.png"),
  "noble-boy-autumn-2": require("../assets/sprites/characters/characters_final/noble boy/noble boy autumn 1 with hat.png"),
  "noble-boy-winter-1": require("../assets/sprites/characters/characters_final/noble boy/noble boy winter 1.png"),
  "noble-boy-winter-2": require("../assets/sprites/characters/characters_final/noble boy/noble boy winter 1_sword.png"),
  "noble-boy-winter-3": require("../assets/sprites/characters/characters_final/noble boy/noble boy winter cloak and hat no sword.png"),

  // ── NOBLE GIRL ──────────────────────────────────────────────────────────
  "noble-girl-spring-1": require("../assets/sprites/characters/characters_final/noble girl/noble girl_spring no hat.png"),
  "noble-girl-spring-2": require("../assets/sprites/characters/characters_final/noble girl/noble girl_spring wth hat.png"),
  "noble-girl-summer-1": require("../assets/sprites/characters/characters_final/noble girl/noble girl_summer no hat.png"),
  "noble-girl-summer-2": require("../assets/sprites/characters/characters_final/noble girl/noble girl_summer with hat.png"),
  "noble-girl-autumn-1": require("../assets/sprites/characters/characters_final/noble girl/noble girl_autumn no hat.png"),
  "noble-girl-autumn-2": require("../assets/sprites/characters/characters_final/noble girl/noble girl autumn with hat.png"),
  "noble-girl-winter-1": require("../assets/sprites/characters/characters_final/noble girl/noble girl_winter no hat.png"),
  "noble-girl-winter-2": require("../assets/sprites/characters/characters_final/noble girl/noble girl_winter with hat.png"),

  // ── MONK GUY — BASE CLASS ───────────────────────────────────────────────
  // Note: ' monk boy with cross.png' has a leading space in the filename
  "monk-guy-base-1": require("../assets/sprites/characters/characters_final/monk guy/ monk boy with cross.png"),
  "monk-guy-base-2": require("../assets/sprites/characters/characters_final/monk guy/monk boy with hat.png"),
  "monk-guy-base-3": require("../assets/sprites/characters/characters_final/monk guy/monk boy with hat and cross.png"),
  "monk-guy-base-4": require("../assets/sprites/characters/characters_final/monk guy/monk boy in klobuk_no cross.png"),
  "monk-guy-base-5": require("../assets/sprites/characters/characters_final/monk guy/monk boy in klobuk with cross.png"),
  "monk-guy-base-6": require("../assets/sprites/characters/characters_final/monk guy/monk boy in klobuk and service dress.png"),
  "monk-guy-base-7": require("../assets/sprites/characters/characters_final/monk guy/monk boy in klobuk and service dress and cross.png"),

  // ── MONK GUY — SEASONAL ─────────────────────────────────────────────────
  "monk-guy-spring-1": require("../assets/sprites/characters/characters_final/monk guy/monk boy_spring.png"),
  "monk-guy-spring-2": require("../assets/sprites/characters/characters_final/monk guy/monk boy_spring with cross.png"),
  "monk-guy-summer-1": require("../assets/sprites/characters/characters_final/monk guy/monk boy_summer.png"),
  "monk-guy-summer-2": require("../assets/sprites/characters/characters_final/monk guy/monk boy_summer with cross.png"),
  "monk-guy-autumn-1": require("../assets/sprites/characters/characters_final/monk guy/monk boy_autumn.png"),
  "monk-guy-autumn-2": require("../assets/sprites/characters/characters_final/monk guy/monk boy_autumn with cross.png"),
  "monk-guy-winter-1": require("../assets/sprites/characters/characters_final/monk guy/monk boy_winter 1.png"),
  "monk-guy-winter-2": require("../assets/sprites/characters/characters_final/monk guy/monk boy_winter 2 with cross.png"),
  "monk-guy-winter-3": require("../assets/sprites/characters/characters_final/monk guy/monk boy_winter with hat no cross.png"),
  "monk-guy-winter-4": require("../assets/sprites/characters/characters_final/monk guy/monk boy_winter with hat and with cross.png"),

  // ── NUN GIRL — BASE CLASS ───────────────────────────────────────────────
  // vanilla 3 is the base character; base-1/2/3 are purchasable progressions
  "nun-girl-base-1": require("../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla with cross.png"),
  "nun-girl-base-2": require("../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla no cross with hat.png"),
  "nun-girl-base-3": require("../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla with hat and cross.png"),

  // ── NUN GIRL — SEASONAL ─────────────────────────────────────────────────
  // Stage order: robes only → cross no hat → hat no cross → hat and cross
  "nun-girl-spring-1": require("../assets/sprites/characters/characters_final/nun girl/nun_spring no cross or hat.png"),
  "nun-girl-spring-2": require("../assets/sprites/characters/characters_final/nun girl/nun_spring no hat with cross.png"),
  "nun-girl-spring-3": require("../assets/sprites/characters/characters_final/nun girl/nun_spring with hat no cross.png"),
  "nun-girl-spring-4": require("../assets/sprites/characters/characters_final/nun girl/nun_spring with hat and cross.png"),
  // Summer: artist numbered files differently from the progression order
  "nun-girl-summer-1": require("../assets/sprites/characters/characters_final/nun girl/nun girl_summer 1 no cross no hat.png"),
  "nun-girl-summer-2": require("../assets/sprites/characters/characters_final/nun girl/nun girl_summer 4 no hat with cross.png"),
  "nun-girl-summer-3": require("../assets/sprites/characters/characters_final/nun girl/nun girl_summer 2 hat no cross.png"),
  "nun-girl-summer-4": require("../assets/sprites/characters/characters_final/nun girl/nun girl_summer 3 with hat and cross.png"),
  // Autumn: same reordering for consistency
  "nun-girl-autumn-1": require("../assets/sprites/characters/characters_final/nun girl/nun_autumn 3 no hat or cross.png"),
  "nun-girl-autumn-2": require("../assets/sprites/characters/characters_final/nun girl/nun_autumn 4 no hat with cross.png"),
  "nun-girl-autumn-3": require("../assets/sprites/characters/characters_final/nun girl/nun_autumn 1 with hat no cross.png"),
  "nun-girl-autumn-4": require("../assets/sprites/characters/characters_final/nun girl/nun_autumn 2 with hat and cross.png"),
  // Winter
  "nun-girl-winter-1": require("../assets/sprites/characters/characters_final/nun girl/nun girl_winter 1.png"),
  "nun-girl-winter-2": require("../assets/sprites/characters/characters_final/nun girl/nun girl_winter 2 with cross.png"),
  "nun-girl-winter-3": require("../assets/sprites/characters/characters_final/nun girl/nun girl_winter 3 no cross or hat.png"),
  "nun-girl-winter-4": require("../assets/sprites/characters/characters_final/nun girl/nun girl_winter 4 with cross no hat.png"),
};

// Vanilla (base) character images by "<class>-<gender>", shown when no set is equipped.
export const VANILLA_CHARACTER_IMAGES: Record<string, ImageSourcePropType> = {
  "fighter-male":   require("../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png"),
  "fighter-female": require("../assets/sprites/characters/characters_final/warrior girl/fighter girl_vanilla.png"),
  "noble-male":     require("../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png"),
  "noble-female":   require("../assets/sprites/characters/characters_final/noble girl/noble girl_vanilla.png"),
  "monk-male":      require("../assets/sprites/characters/characters_final/monk guy/vanilla monk boy no cross.png"),
  "monk-female":    require("../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla 3.png"),
};

/**
 * Resolves a character set image_path key to the full-character portrait PNG.
 * Returns null if the key is unknown (caller should fall back to base character).
 */
export const resolveCharacterSetImage = (imagePath: string | null | undefined): ImageSourcePropType | null => {
  if (!imagePath) return null;
  return CHARACTER_SET_MAP[imagePath] ?? null;
};
