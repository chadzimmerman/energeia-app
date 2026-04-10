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

// Primary UI accent color — replaces purple (#A737FD) throughout the app
const SEASON_COLORS: Record<Season, { primary: string; dark: string }> = {
  spring: { primary: '#5A9E6F', dark: '#3D7A52' },
  summer: { primary: '#E8A020', dark: '#B07010' },
  autumn: { primary: '#C4622D', dark: '#8B3A18' },
  winter: { primary: '#4A8FB5', dark: '#2E6A8A' },
};

export function getSeasonalColor(): string {
  return SEASON_COLORS[getCurrentSeason()].primary;
}

// Darker variant — used for input backgrounds and secondary surfaces
export function getSeasonalDarkColor(): string {
  return SEASON_COLORS[getCurrentSeason()].dark;
}
