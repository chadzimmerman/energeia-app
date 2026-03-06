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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MALE_PLACEHOLDER   = require('../assets/sprites/characters/warrior/base-male.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FEMALE_PLACEHOLDER = require('../assets/sprites/characters/princess/base-princess.png');

const CHARACTER_IMAGE_MAP: Record<string, ImageSourcePropType> = {

  // ── Monk ──────────────────────────────────────────────────────────────────
  monk_male_young:   MALE_PLACEHOLDER,   // TODO: young monk boy
  monk_male_adult:   MALE_PLACEHOLDER,   // TODO: adult monk, trimmed beard
  monk_male_elder:   MALE_PLACEHOLDER,   // TODO: elder monk, full white beard

  monk_female_young: FEMALE_PLACEHOLDER, // TODO: young nun girl
  monk_female_adult: FEMALE_PLACEHOLDER, // TODO: adult nun
  monk_female_elder: FEMALE_PLACEHOLDER, // TODO: elder abbess

  // ── Fighter ───────────────────────────────────────────────────────────────
  fighter_male_young:   MALE_PLACEHOLDER,   // TODO: young fighter boy
  fighter_male_adult:   MALE_PLACEHOLDER,   // TODO: seasoned warrior
  fighter_male_elder:   MALE_PLACEHOLDER,   // TODO: weathered veteran

  fighter_female_young: FEMALE_PLACEHOLDER, // TODO: young fighter girl
  fighter_female_adult: FEMALE_PLACEHOLDER, // TODO: battle-hardened woman
  fighter_female_elder: FEMALE_PLACEHOLDER, // TODO: elder shield-maiden

  // ── Noble ─────────────────────────────────────────────────────────────────
  noble_male_young:   MALE_PLACEHOLDER,   // TODO: noble boy
  noble_male_adult:   MALE_PLACEHOLDER,   // TODO: nobleman with beard
  noble_male_elder:   MALE_PLACEHOLDER,   // TODO: elder king

  noble_female_young: FEMALE_PLACEHOLDER, // TODO: noble girl
  noble_female_adult: FEMALE_PLACEHOLDER, // TODO: noblewoman
  noble_female_elder: FEMALE_PLACEHOLDER, // TODO: full queen

  // ── Base keys (fallback, no level suffix) ─────────────────────────────────
  monk_male:    MALE_PLACEHOLDER,
  monk_female:  FEMALE_PLACEHOLDER,
  fighter_male:    MALE_PLACEHOLDER,
  fighter_female:  FEMALE_PLACEHOLDER,
  noble_male:    MALE_PLACEHOLDER,
  noble_female:  FEMALE_PLACEHOLDER,
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
