import { ImageSourcePropType } from 'react-native';

// Metro requires static require() strings — all variants must be listed here.
// Alpha: all classes share the same base male/female sprite.
// Swap individual entries as class-specific art is created.
const CHARACTER_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  monk_male:    require('../assets/sprites/characters/warrior/base-male.png'),
  fighter_male: require('../assets/sprites/characters/warrior/base-male.png'),
  noble_male:   require('../assets/sprites/characters/warrior/base-male.png'),

  monk_female:    require('../assets/sprites/characters/princess/base-princess.png'),
  fighter_female: require('../assets/sprites/characters/princess/base-princess.png'),
  noble_female:   require('../assets/sprites/characters/princess/base-princess.png'),
};

/**
 * Resolves a character_image_path string to an ImageSourcePropType.
 * Accepts keys like "monk_male", legacy full paths, or remote Supabase URLs.
 */
export const resolveCharacterImage = (
  path: string | null | undefined
): ImageSourcePropType => {
  if (!path) return CHARACTER_IMAGE_MAP.monk_male;

  // Key-based (set by onboarding)
  if (CHARACTER_IMAGE_MAP[path]) return CHARACTER_IMAGE_MAP[path];

  // Legacy default
  if (path.includes('novice-monk-male.png')) return CHARACTER_IMAGE_MAP.monk_male;

  // Remote URL fallback
  return { uri: path };
};
