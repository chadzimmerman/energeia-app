import * as Application from "expo-application";
import { isVersionAtLeast, checkMinVersion } from "../versionCheck";
import { supabase } from "../supabase";

jest.mock("expo-application", () => ({ nativeApplicationVersion: "1.0.0" }));

/** Points the app_config lookup at a value, or makes it throw. */
const mockConfig = (result: { data?: { value: string } | null } | Error) => {
  (supabase.from as jest.Mock).mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
      }),
    }),
  });
};

const setAppVersion = (v: string | null) => {
  (Application as { nativeApplicationVersion: string | null }).nativeApplicationVersion = v;
};

beforeEach(() => {
  jest.clearAllMocks();
  setAppVersion("1.0.0");
});

describe("isVersionAtLeast", () => {
  it("accepts an exact match", () => {
    expect(isVersionAtLeast("1.2.3", "1.2.3")).toBe(true);
  });

  it("accepts a higher patch", () => {
    expect(isVersionAtLeast("1.2.4", "1.2.3")).toBe(true);
  });

  it("rejects a lower patch", () => {
    expect(isVersionAtLeast("1.2.2", "1.2.3")).toBe(false);
  });

  it("compares numerically, not as strings", () => {
    // "1.10.0" < "1.9.0" as a string compare. Getting this wrong locks out the
    // newest build and lets the oldest through.
    expect(isVersionAtLeast("1.10.0", "1.9.0")).toBe(true);
    expect(isVersionAtLeast("1.9.0", "1.10.0")).toBe(false);
  });

  it("weighs major over minor and patch", () => {
    expect(isVersionAtLeast("2.0.0", "1.99.99")).toBe(true);
    expect(isVersionAtLeast("1.99.99", "2.0.0")).toBe(false);
  });

  it("handles double digit majors", () => {
    expect(isVersionAtLeast("10.0.0", "9.0.0")).toBe(true);
  });
});

describe("checkMinVersion", () => {
  it("passes when the running version meets the minimum", async () => {
    setAppVersion("1.2.0");
    mockConfig({ data: { value: "1.0.0" } });
    await expect(checkMinVersion()).resolves.toBe(true);
  });

  it("blocks when the running version is below the minimum", async () => {
    setAppVersion("1.0.0");
    mockConfig({ data: { value: "2.0.0" } });
    await expect(checkMinVersion()).resolves.toBe(false);
  });

  // The next three are the whole reason this function is worth testing. A gate
  // that fails closed turns any backend hiccup into a total outage: every
  // install shows a blocking update modal for a release that does not exist.

  it("fails open when the config row is missing", async () => {
    mockConfig({ data: null });
    await expect(checkMinVersion()).resolves.toBe(true);
  });

  it("fails open when the query throws", async () => {
    mockConfig(new Error("network unreachable"));
    await expect(checkMinVersion()).resolves.toBe(true);
  });

  it("fails open when the app reports no version at all", async () => {
    // nativeApplicationVersion is null on some simulator builds. Defaulting to
    // "0.0.0" would block every one of them, so the error path has to win.
    setAppVersion(null);
    mockConfig(new Error("no version"));
    await expect(checkMinVersion()).resolves.toBe(true);
  });

  it("never throws, whatever the backend does", async () => {
    mockConfig(new Error("boom"));
    await expect(checkMinVersion()).resolves.toBeDefined();
  });
});
