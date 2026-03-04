import { ImageSourcePropType } from 'react-native';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

// Meteorological seasons: clean month-based boundaries
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1–12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter'; // Dec, Jan, Feb
}

// require() must use static strings — Metro bundler resolves these at build time
const SEASON_BACKGROUNDS: Record<Season, ImageSourcePropType> = {
  winter: require('../assets/sprites/ui-elements/winter-background.png'),
  spring: require('../assets/sprites/ui-elements/spring-background.jpeg'),
  summer: require('../assets/sprites/ui-elements/summer-background.jpeg'),
  autumn: require('../assets/sprites/ui-elements/autumn-background.jpeg'),
};

export function getSeasonalBackground(): ImageSourcePropType {
  return SEASON_BACKGROUNDS[getCurrentSeason()];
}
