import {
  getCurrentSeason,
  nextSeasonBoundary,
  getSeasonalBackground,
  getLoginBackground,
  getSeasonalColor,
  getSeasonalDarkColor,
  type Season,
} from "../seasons";

/** Freezes the clock at noon on the given month and day of 2026. */
const at = (month: number, day: number) => {
  jest.useFakeTimers().setSystemTime(new Date(2026, month - 1, day, 12));
};

afterEach(() => {
  jest.useRealTimers();
});

describe("getCurrentSeason", () => {
  const cases: [number, Season][] = [
    [1, "winter"],
    [2, "winter"],
    [3, "spring"],
    [4, "spring"],
    [5, "spring"],
    [6, "summer"],
    [7, "summer"],
    [8, "summer"],
    [9, "autumn"],
    [10, "autumn"],
    [11, "autumn"],
    [12, "winter"],
  ];

  it.each(cases)("month %i is %s", (month, expected) => {
    at(month, 15);
    expect(getCurrentSeason()).toBe(expected);
  });

  it("covers all twelve months with no gap", () => {
    // A season lookup that returns undefined for one month would leave the app
    // with no palette and no header art for that month.
    const seen = new Set<Season>();
    for (let m = 1; m <= 12; m++) {
      at(m, 1);
      const season = getCurrentSeason();
      expect(season).toBeDefined();
      seen.add(season);
    }
    expect([...seen].sort()).toEqual(["autumn", "spring", "summer", "winter"]);
  });

  it("switches on the first day of a boundary month", () => {
    at(2, 28);
    expect(getCurrentSeason()).toBe("winter");
    at(3, 1);
    expect(getCurrentSeason()).toBe("spring");
  });

  it("keeps December with winter rather than wrapping to autumn", () => {
    at(11, 30);
    expect(getCurrentSeason()).toBe("autumn");
    at(12, 1);
    expect(getCurrentSeason()).toBe("winter");
  });
});

describe("seasonal assets", () => {
  it("resolves a header background for every season", () => {
    for (let m = 1; m <= 12; m++) {
      at(m, 1);
      expect(getSeasonalBackground()).toBeDefined();
    }
  });

  it("resolves a login background for every season", () => {
    for (let m = 1; m <= 12; m++) {
      at(m, 1);
      expect(getLoginBackground()).toBeDefined();
    }
  });
});

describe("seasonal colors", () => {
  it("returns a hex color for every season", () => {
    for (let m = 1; m <= 12; m++) {
      at(m, 1);
      expect(getSeasonalColor()).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(getSeasonalDarkColor()).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("gives each season a distinct primary color", () => {
    const colors = new Set<string>();
    for (const month of [1, 4, 7, 10]) {
      at(month, 1);
      colors.add(getSeasonalColor());
    }
    expect(colors.size).toBe(4);
  });

  it("keeps the dark variant different from the primary", () => {
    for (const month of [1, 4, 7, 10]) {
      at(month, 1);
      expect(getSeasonalDarkColor()).not.toBe(getSeasonalColor());
    }
  });
});

describe("nextSeasonBoundary", () => {
  const cases: [number, number, string][] = [
    // [month, day, expected boundary ISO date]
    [1, 15, "2026-03-01"],   // winter  -> spring
    [4, 2, "2026-06-01"],    // spring  -> summer
    [7, 20, "2026-09-01"],   // summer  -> autumn
    [10, 5, "2026-12-01"],   // autumn  -> winter
    [12, 25, "2027-03-01"],  // Dec rolls over into next year
  ];

  it.each(cases)("from %i/%i the next boundary is %s", (month, day, expected) => {
    at(month, day);
    const boundary = nextSeasonBoundary();
    expect(boundary.getFullYear()).toBe(Number(expected.slice(0, 4)));
    expect(boundary.getMonth() + 1).toBe(Number(expected.slice(5, 7)));
    expect(boundary.getDate()).toBe(1);
  });

  it("is always strictly in the future", () => {
    // A boundary at or before now would make SeasonProvider's timer fire with a
    // zero delay and immediately re-arm on the same instant — a spin loop.
    for (let m = 1; m <= 12; m++) {
      for (const day of [1, 15, 28]) {
        at(m, day);
        expect(nextSeasonBoundary().getTime()).toBeGreaterThan(Date.now());
      }
    }
  });

  it("lands exactly on the instant the season changes", () => {
    // This is the bug in #23: at 11:59 PM on the last day of a season the app
    // must repaint at midnight, not keep the old palette until a cold restart.
    at(5, 31);
    const before = getCurrentSeason();
    const boundary = nextSeasonBoundary();

    jest.setSystemTime(new Date(boundary.getTime() - 1));
    expect(getCurrentSeason()).toBe(before);

    jest.setSystemTime(boundary);
    expect(getCurrentSeason()).not.toBe(before);
  });

  it("starts the very first midnight of each season", () => {
    at(2, 10);
    const boundary = nextSeasonBoundary();
    expect(boundary.getHours()).toBe(0);
    expect(boundary.getMinutes()).toBe(0);
    expect(boundary.getSeconds()).toBe(0);
    expect(boundary.getMilliseconds()).toBe(0);
  });
});

describe("explicit season argument", () => {
  // SeasonProvider holds the season in state and passes it down, so the getters
  // must honour the argument rather than re-reading the clock.
  it("ignores the current date when a season is passed", () => {
    at(7, 4); // summer
    expect(getSeasonalColor("winter")).toBe(getSeasonalColorAtMonth(1));
    expect(getSeasonalDarkColor("winter")).not.toBe(getSeasonalDarkColor("summer"));
    expect(getSeasonalBackground("autumn")).toBe(getSeasonalBackgroundAtMonth(10));
    expect(getLoginBackground("spring")).toBe(getLoginBackgroundAtMonth(4));
  });

  it("still falls back to the clock when called with no argument", () => {
    at(10, 10);
    expect(getSeasonalColor()).toBe(getSeasonalColor("autumn"));
  });
});

// Helpers that read a value the old way — by moving the clock — so the tests
// above compare the argument path against the clock path.
function getSeasonalColorAtMonth(month: number) {
  at(month, 1);
  const value = getSeasonalColor();
  at(7, 4);
  return value;
}
function getSeasonalBackgroundAtMonth(month: number) {
  at(month, 1);
  const value = getSeasonalBackground();
  at(7, 4);
  return value;
}
function getLoginBackgroundAtMonth(month: number) {
  at(month, 1);
  const value = getLoginBackground();
  at(7, 4);
  return value;
}
