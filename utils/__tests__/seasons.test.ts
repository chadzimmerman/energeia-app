import {
  getCurrentSeason,
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
