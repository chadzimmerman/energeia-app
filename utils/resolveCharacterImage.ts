import { ImageSourcePropType } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL TIERS
//   young  → Level  0–19
//   adult  → Level 20–39
//   elder  → Level 40+
//
// HOW TO ADD NEW SPRITES:
//   1. Drop the PNG into assets/sprites/characters/<class>/
//   2. Replace the import on the matching key below — nothing else changes.
//
// Metro requires every require() path to be a static string literal,
// so all 18 tier entries must be listed here even if they share the same file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Placeholders (swap these out as art is ready) ──────────────────────────
 
const MALE_PLACEHOLDER   = require('../assets/sprites/characters/genders/base-male.png');
 
const FEMALE_PLACEHOLDER = require('../assets/sprites/characters/genders/princess-base.png');

const CHARACTER_IMAGE_MAP: Record<string, ImageSourcePropType> = {

  // ── Monk ──────────────────────────────────────────────────────────────────
   
  monk_male_young:   require('../assets/sprites/characters/characters_final/monk guy/vanilla monk boy no cross.png'),
  monk_male_adult:   MALE_PLACEHOLDER,
  monk_male_elder:   MALE_PLACEHOLDER,

   
  monk_female_young: require('../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla 3.png'),
  monk_female_adult: FEMALE_PLACEHOLDER,
  monk_female_elder: FEMALE_PLACEHOLDER,

  // ── Fighter ───────────────────────────────────────────────────────────────
   
  fighter_male_young:   require('../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png'),
  fighter_male_adult:   MALE_PLACEHOLDER,
  fighter_male_elder:   MALE_PLACEHOLDER,

   
  fighter_female_young: require('../assets/sprites/characters/characters_final/warrior girl/fighter girl_vanilla.png'),
  fighter_female_adult: FEMALE_PLACEHOLDER,
  fighter_female_elder: FEMALE_PLACEHOLDER,

  // ── Noble ─────────────────────────────────────────────────────────────────
   
  noble_male_young:   require('../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png'),
  noble_male_adult:   MALE_PLACEHOLDER,
  noble_male_elder:   MALE_PLACEHOLDER,

   
  noble_female_young: require('../assets/sprites/characters/characters_final/noble girl/noble girl_vanilla.png'),
  noble_female_adult: FEMALE_PLACEHOLDER,
  noble_female_elder: FEMALE_PLACEHOLDER,

  // ── Base keys (fallback, no level suffix) ─────────────────────────────────
   
  monk_male:    require('../assets/sprites/characters/characters_final/monk guy/vanilla monk boy no cross.png'),
   
  monk_female:  require('../assets/sprites/characters/characters_final/nun girl/nun girl_vanilla 3.png'),
   
  fighter_male:    require('../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png'),
   
  fighter_female:  require('../assets/sprites/characters/characters_final/warrior girl/fighter girl_vanilla.png'),
   
  noble_male:    require('../assets/sprites/characters/characters_final/fighter boy/vanilla fighter boy.png'),
   
  noble_female:  require('../assets/sprites/characters/characters_final/noble girl/noble girl_vanilla.png'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getLevelTier = (level: number): 'young' | 'adult' | 'elder' => {
  if (level >= 40) return 'elder';
  if (level >= 20) return 'adult';
  return 'young';
};

/**
 * Resolves a character_image_path key to the correct sprite for the given level.
 * Falls back to base key → male placeholder if tier sprite not found.
 *
 * @param path  The key stored in profiles.character_image_path (e.g. "fighter_male")
 * @param level The player's current level (default 0 = young tier)
 */
export const resolveCharacterImage = (
  path: string | null | undefined,
  level: number = 0,
): ImageSourcePropType => {
  if (!path) return CHARACTER_IMAGE_MAP.monk_male_young;

  // Legacy path fallback
  if (path.includes('novice-monk-male.png')) return CHARACTER_IMAGE_MAP.monk_male_young;

  // Remote URL — return as-is (level tiers handled locally only)
  if (path.startsWith('http')) return { uri: path };

  // Try tier-specific key first, fall back to base key
  const tier = getLevelTier(level);
  const tieredKey = `${path}_${tier}`;
  return CHARACTER_IMAGE_MAP[tieredKey] ?? CHARACTER_IMAGE_MAP[path] ?? MALE_PLACEHOLDER;
};
