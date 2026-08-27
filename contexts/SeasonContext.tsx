import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus, ImageSourcePropType } from "react-native";
import {
  Season,
  getCurrentSeason,
  getLoginBackground,
  getSeasonalBackground,
  getSeasonalColor,
  getSeasonalDarkColor,
  nextSeasonBoundary,
} from "@/utils/seasons";

export interface SeasonContextValue {
  season: Season;
  seasonColor: string;
  seasonDarkColor: string;
  seasonBackground: ImageSourcePropType;
  loginBackground: ImageSourcePropType;
}

// setTimeout stores its delay in a signed 32-bit int. A larger value wraps and
// fires immediately, which would spin. Season gaps are ~90 days (~7.8e9 ms),
// far past the limit, so hop in capped chunks and re-arm until we land on it.
const MAX_TIMEOUT = 2 ** 31 - 1;

function valueForSeason(season: Season): SeasonContextValue {
  return {
    season,
    seasonColor: getSeasonalColor(season),
    seasonDarkColor: getSeasonalDarkColor(season),
    seasonBackground: getSeasonalBackground(season),
    loginBackground: getLoginBackground(season),
  };
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy initializer: getCurrentSeason() runs on first render, not at import.
  const [season, setSeason] = useState<Season>(getCurrentSeason);

  // Two triggers, because either alone leaves a gap:
  //   - a timer covers a session left open across a boundary
  //   - AppState covers a session backgrounded across one, where timers are
  //     throttled or suspended by the OS and may never fire
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const syncSeason = () => setSeason((prev) => {
      const current = getCurrentSeason();
      return current === prev ? prev : current; // keep identity when unchanged
    });

    const scheduleNext = () => {
      const ms = nextSeasonBoundary().getTime() - Date.now();
      timer = setTimeout(() => {
        syncSeason();
        scheduleNext();
      }, Math.max(0, Math.min(ms, MAX_TIMEOUT)));
    };

    scheduleNext();

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") syncSeason();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  const value = useMemo(() => valueForSeason(season), [season]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
};

export const useSeason = (): SeasonContextValue => {
  const ctx = useContext(SeasonContext);
  // No provider — a component rendered in isolation, as tests do. Fall back to
  // a live read: correct at first render, just without the auto-refresh.
  return ctx ?? valueForSeason(getCurrentSeason());
};
