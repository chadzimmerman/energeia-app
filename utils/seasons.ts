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

// First day of each season, 1-indexed: Mar 1, Jun 1, Sep 1, Dec 1
const SEASON_START_MONTHS = [3, 6, 9, 12];

// The next instant getCurrentSeason() will return something different.
// SeasonProvider schedules a timer against this so a session that stays open
// across a boundary still repaints instead of holding the old accent color.
export function nextSeasonBoundary(now: Date = new Date()): Date {
  const year = now.getFullYear();
  for (const month of SEASON_START_MONTHS) {
    const boundary = new Date(year, month - 1, 1, 0, 0, 0, 0);
    if (boundary.getTime() > now.getTime()) return boundary;
  }
  // Past Dec 1 — the next boundary is Mar 1 of next year
  return new Date(year + 1, 2, 1, 0, 0, 0, 0);
}

// require() must use static strings — Metro bundler resolves these at build time
const SEASON_BACKGROUNDS: Record<Season, ImageSourcePropType> = {
  spring: require('../assets/sprites/ui-elements/grand finale/fin_spring_header.png'),
  summer: require('../assets/sprites/ui-elements/grand finale/fin_summer_header.png'),
  autumn: require('../assets/sprites/ui-elements/grand finale/fin_autumn_header.png'),
  winter: require('../assets/sprites/ui-elements/grand finale/fin_winter_header.png'),
};

export function getSeasonalBackground(season: Season = getCurrentSeason()): ImageSourcePropType {
  return SEASON_BACKGROUNDS[season];
}

const SEASON_LOGIN_BACKGROUNDS: Record<Season, ImageSourcePropType> = {
  spring: require('../assets/sprites/ui-elements/grand finale/fin_spring splash.png'),
  summer: require('../assets/sprites/ui-elements/grand finale/fin_summer splash.png'),
  autumn: require('../assets/sprites/ui-elements/grand finale/fin_autumn splash.png'),
  winter: require('../assets/sprites/ui-elements/grand finale/fin_splash winter.png'),
};

export function getLoginBackground(season: Season = getCurrentSeason()): ImageSourcePropType {
  return SEASON_LOGIN_BACKGROUNDS[season];
}

// Primary UI accent color — replaces purple (#A737FD) throughout the app
const SEASON_COLORS: Record<Season, { primary: string; dark: string }> = {
  spring: { primary: '#5A9E6F', dark: '#3D7A52' },
  summer: { primary: '#E8A020', dark: '#B07010' },
  autumn: { primary: '#C4622D', dark: '#8B3A18' },
  winter: { primary: '#4A8FB5', dark: '#2E6A8A' },
};

export function getSeasonalColor(season: Season = getCurrentSeason()): string {
  return SEASON_COLORS[season].primary;
}

// Darker variant — used for input backgrounds and secondary surfaces
export function getSeasonalDarkColor(season: Season = getCurrentSeason()): string {
  return SEASON_COLORS[season].dark;
}
