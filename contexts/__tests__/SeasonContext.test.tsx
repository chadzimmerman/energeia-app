import React from "react";
import { AppState, Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { SeasonProvider, useSeason } from "../SeasonContext";
import { getSeasonalColor } from "@/utils/seasons";

const MAX_TIMEOUT = 2 ** 31 - 1;

/** Renders the context value so assertions can read it out of the tree. */
const Probe = () => {
  const { season, seasonColor, seasonDarkColor } = useSeason();
  return (
    <>
      <Text testID="season">{season}</Text>
      <Text testID="color">{seasonColor}</Text>
      <Text testID="dark">{seasonDarkColor}</Text>
    </>
  );
};

/** Captures the handler SeasonProvider registers so tests can fire it. */
let fireAppState: ((status: string) => void) | null = null;

beforeEach(() => {
  fireAppState = null;
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _type: string,
    handler: (status: string) => void,
  ) => {
    fireAppState = handler;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/**
 * Freezes the clock at the given 2026 date. Kept separate from rendering because
 * useFakeTimers() swaps out global.setTimeout — any spy on it has to be
 * installed after this call, not before.
 */
const freezeAt = (month: number, day: number, hour = 12, minute = 0) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, month - 1, day, hour, minute));
};

const renderProvider = () =>
  render(
    <SeasonProvider>
      <Probe />
    </SeasonProvider>,
  );

const renderAt = (month: number, day: number, hour = 12, minute = 0) => {
  freezeAt(month, day, hour, minute);
  return renderProvider();
};

describe("SeasonProvider", () => {
  it("serves the season matching the current date", () => {
    renderAt(7, 4);
    expect(screen.getByTestId("season")).toHaveTextContent("summer");
    expect(screen.getByTestId("color")).toHaveTextContent(getSeasonalColor("summer"));
  });

  it("repaints at midnight when a session is left open across a boundary", () => {
    // The exact scenario in #23: open at 11:59 PM on May 31, still open on June 1.
    renderAt(5, 31, 23, 59);
    expect(screen.getByTestId("season")).toHaveTextContent("spring");

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000); // tick past midnight
    });

    expect(screen.getByTestId("season")).toHaveTextContent("summer");
    expect(screen.getByTestId("color")).toHaveTextContent(getSeasonalColor("summer"));
  });

  it("repaints on foreground resume when the app was backgrounded across a boundary", () => {
    // Timers are throttled or suspended while backgrounded, so the timer alone
    // is not enough — AppState is the second trigger.
    renderAt(8, 31, 23, 0);
    expect(screen.getByTestId("season")).toHaveTextContent("summer");

    act(() => {
      jest.setSystemTime(new Date(2026, 8, 3, 9, 0)); // Sep 3, no timers run
      fireAppState?.("active");
    });

    expect(screen.getByTestId("season")).toHaveTextContent("autumn");
  });

  it("ignores background and inactive AppState transitions", () => {
    renderAt(1, 15);
    act(() => {
      fireAppState?.("background");
      fireAppState?.("inactive");
    });
    expect(screen.getByTestId("season")).toHaveTextContent("winter");
  });

  it("caps the scheduled delay so a far-off boundary cannot overflow setTimeout", () => {
    // A delay past 2^31-1 ms wraps to a negative int and fires immediately,
    // which would spin. Jan 1 -> Mar 1 is ~5.1e9 ms, well past the limit.
    freezeAt(1, 1);
    const spy = jest.spyOn(global, "setTimeout");
    renderProvider();

    const delays = spy.mock.calls.map((call) => call[1] as number);
    expect(delays.length).toBeGreaterThan(0);
    for (const delay of delays) {
      expect(delay).toBeLessThanOrEqual(MAX_TIMEOUT);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
    expect(Math.max(...delays)).toBe(MAX_TIMEOUT);
  });

  it("re-arms after a capped hop instead of stopping short of the boundary", () => {
    renderAt(1, 1);
    expect(screen.getByTestId("season")).toHaveTextContent("winter");

    act(() => {
      jest.advanceTimersByTime(MAX_TIMEOUT); // ~24.8 days: still winter
    });
    expect(screen.getByTestId("season")).toHaveTextContent("winter");

    act(() => {
      jest.advanceTimersByTime(MAX_TIMEOUT); // ~49.7 days total: still winter
    });
    expect(screen.getByTestId("season")).toHaveTextContent("winter");

    act(() => {
      jest.advanceTimersByTime(15 * 24 * 60 * 60 * 1000); // past Mar 1
    });
    expect(screen.getByTestId("season")).toHaveTextContent("spring");
  });

  it("clears its timer and listener on unmount", () => {
    const remove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockImplementation((() => ({ remove })) as never);
    freezeAt(4, 1);
    const clear = jest.spyOn(global, "clearTimeout");

    const view = renderProvider();
    view.unmount();

    expect(remove).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });
});

describe("useSeason without a provider", () => {
  it("falls back to a live read rather than throwing", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 15)); // November
    render(<Probe />);
    expect(screen.getByTestId("season")).toHaveTextContent("autumn");
    expect(screen.getByTestId("color")).toHaveTextContent(getSeasonalColor("autumn"));
  });
});
