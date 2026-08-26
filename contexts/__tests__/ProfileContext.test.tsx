import React from "react";
import { Text } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";
import { ProfileProvider, useProfile } from "../ProfileContext";
import {
  installSupabaseMock,
  setSession,
  setTable,
  setTableError,
  writesTo,
} from "@/test/supabaseMock";
import { CURRENT_DATA_VERSION } from "@/utils/migrations";

const profileRow = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  username: "Brother Chad",
  current_health: 80,
  base_max_health: 100,
  max_health: 100,
  current_energeia: 40,
  max_energeia: 100,
  energeia_currency: 25,
  level: 7,
  character_image_path: "monk_male",
  player_class: "Monk",
  group_id: null,
  data_version: CURRENT_DATA_VERSION,
  ...overrides,
});

/** Renders a probe inside the provider and exposes the context value. */
const Probe = () => {
  const ctx = useProfile();
  return (
    <>
      <Text testID="username">{ctx.profile?.username ?? "none"}</Text>
      <Text testID="level">{String(ctx.profile?.level ?? "none")}</Text>
      <Text testID="pet">{ctx.petName ?? "none"}</Text>
      <Text testID="overlays">{String(ctx.equippedOverlays.length)}</Text>
      <Text testID="wall">{ctx.characterBgColors.wall}</Text>
    </>
  );
};

const renderProvider = () =>
  render(
    <ProfileProvider>
      <Probe />
    </ProfileProvider>,
  );

beforeEach(() => {
  installSupabaseMock();
  setTable("user_inventory", []);
});

describe("ProfileProvider", () => {
  it("loads the signed-in user's profile", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow()]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(screen.getByTestId("level")).toHaveTextContent("7");
  });

  it("stays empty when nobody is signed in", async () => {
    setSession(null);
    setTable("profiles", [profileRow()]);

    renderProvider();

    // No session means no user id, so the profile query is never issued. The
    // provider must not fall through and load somebody else's row.
    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("none"));
    expect(writesTo("profiles")).toHaveLength(0);
  });

  it("creates a default profile when the user has no row yet", async () => {
    setSession("user-new");
    setTable("profiles", []);

    renderProvider();

    await waitFor(() => expect(writesTo("profiles").length).toBeGreaterThan(0));
    const created = writesTo("profiles")[0];
    expect(created.op).toBe("upsert");
    expect(created.payload).toMatchObject({
      id: "user-new",
      current_health: 100,
      max_health: 100,
      level: 1,
    });
  });

  it("starts a new user at the current data version, skipping historical migrations", async () => {
    // A brand new row has no legacy data to migrate. Starting at 0 would run
    // every past migration against a profile that never needed them, which for
    // the alpha-to-beta migration means wiping an inventory that was never
    // populated.
    setSession("user-new");
    setTable("profiles", []);

    renderProvider();

    await waitFor(() => expect(writesTo("profiles").length).toBeGreaterThan(0));
    expect(writesTo("profiles")[0].payload).toMatchObject({
      data_version: CURRENT_DATA_VERSION,
    });
  });

  it("runs migrations for a profile behind the current version", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ data_version: 0 })]);
    setTable("user_inventory", []);
    setTable("user_story_progress", []);

    renderProvider();

    // The alpha-to-beta migration clears inventory and story progress.
    await waitFor(() => {
      expect(writesTo("user_inventory").some((w) => w.op === "delete")).toBe(true);
    });
    expect(writesTo("user_story_progress").some((w) => w.op === "delete")).toBe(true);
  });

  it("does not run migrations for a profile already at the current version", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ data_version: CURRENT_DATA_VERSION })]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(writesTo("user_story_progress")).toHaveLength(0);
  });

  it("treats a missing data_version as 0 and migrates", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ data_version: null })]);
    setTable("user_story_progress", []);

    renderProvider();

    await waitFor(() =>
      expect(writesTo("user_story_progress").some((w) => w.op === "delete")).toBe(true),
    );
  });
});

describe("ProfileProvider equipment", () => {
  it("unequips an item whose required class no longer matches", async () => {
    // A class change must not leave a Monk wearing a Fighter's sword. This runs
    // on every refresh rather than only at the moment of the change, so a
    // half-finished class switch still resolves.
    setSession("user-1");
    setTable("profiles", [profileRow({ player_class: "Monk", character_image_path: "monk_male" })]);
    setTable("user_inventory", [
      { id: "inv-1", item: { required_class: "fighter", gender: null } },
    ]);

    renderProvider();

    await waitFor(() =>
      expect(writesTo("user_inventory").some((w) => w.op === "update")).toBe(true),
    );
    expect(
      writesTo("user_inventory").find((w) => w.op === "update")?.payload,
    ).toEqual({ is_equipped: false });
  });

  it("unequips an item whose gender no longer matches", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ character_image_path: "monk_female" })]);
    setTable("user_inventory", [{ id: "inv-1", item: { required_class: null, gender: "male" } }]);

    renderProvider();

    await waitFor(() =>
      expect(writesTo("user_inventory").some((w) => w.op === "update")).toBe(true),
    );
  });

  it("keeps an item that matches both class and gender", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ player_class: "Monk", character_image_path: "monk_male" })]);
    setTable("user_inventory", [
      { id: "inv-1", item: { required_class: "monk", gender: "male", image_path: "x.png" } },
    ]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(writesTo("user_inventory").filter((w) => w.op === "update")).toHaveLength(0);
  });

  it("keeps an unrestricted item for any class or gender", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow()]);
    setTable("user_inventory", [
      { id: "inv-1", item: { required_class: null, gender: null, image_path: "x.png" } },
    ]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(writesTo("user_inventory").filter((w) => w.op === "update")).toHaveLength(0);
  });

  it("reads gender from the last segment of the character path", async () => {
    // character_image_path is "class_gender". Anything not ending in "female"
    // is treated as male, so a malformed path degrades rather than throwing.
    setSession("user-1");
    setTable("profiles", [profileRow({ character_image_path: "" })]);
    setTable("user_inventory", [{ id: "inv-1", item: { required_class: null, gender: "female" } }]);

    renderProvider();

    await waitFor(() =>
      expect(writesTo("user_inventory").some((w) => w.op === "update")).toBe(true),
    );
  });
});

describe("ProfileProvider resilience", () => {
  it("renders children even when the profile query fails", async () => {
    // A failed read must not blank the app. The provider keeps its default
    // context value and the tree below still mounts.
    setSession("user-1");
    setTableError("profiles", new Error("offline"));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("none"));
    expect(screen.getByTestId("wall")).toHaveTextContent("transparent");
  });

  it("renders children when the inventory query fails", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow()]);
    setTableError("user_inventory", new Error("offline"));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(screen.getByTestId("overlays")).toHaveTextContent("0");
  });

  it("exposes safe defaults before anything loads", () => {
    setSession("user-1");
    setTable("profiles", [profileRow()]);

    renderProvider();

    // First synchronous render, before any await resolves. Every consumer reads
    // these, so an undefined here is a crash on launch.
    expect(screen.getByTestId("username")).toHaveTextContent("none");
    expect(screen.getByTestId("overlays")).toHaveTextContent("0");
    expect(screen.getByTestId("pet")).toHaveTextContent("none");
  });

  it("provides a usable context outside a provider", async () => {
    // Several screens render before the provider mounts during navigation.
    // The default context value has to be complete, not a bare null.
    render(<Probe />);
    expect(screen.getByTestId("username")).toHaveTextContent("none");
    expect(screen.getByTestId("wall")).toHaveTextContent("transparent");
  });

  it("refreshProfile can be awaited without a session", async () => {
    setSession(null);
    const Refresher = () => {
      const { refreshProfile } = useProfile();
      React.useEffect(() => {
        void refreshProfile();
      }, [refreshProfile]);
      return <Text testID="ok">ok</Text>;
    };

    render(
      <ProfileProvider>
        <Refresher />
      </ProfileProvider>,
    );

    // The early return on a null session must not leave a rejected promise
    // behind, which would surface as an unhandled rejection on launch.
    await waitFor(() => expect(screen.getByTestId("ok")).toBeTruthy());
  });
});

describe("max health derived from equipped gear", () => {
  /** An equipped inventory row carrying a hidden stat bonus. */
  const gear = (stat: string, value: number) => ({
    id: `inv-${stat}-${value}`,
    is_equipped: true,
    item: { hidden_stat_type: stat, hidden_buff_value: value },
  });

  /** The last write to profiles that touched max_health, if any. */
  const healthWrite = () =>
    writesTo("profiles")
      .filter((w) => w.payload && "max_health" in w.payload)
      .pop();

  it("adds equipped health gear to the levelled base", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 120 })]);
    setTable("user_inventory", [gear("health", 10)]);

    renderProvider();

    await waitFor(() => expect(healthWrite()).toBeDefined());
    expect(healthWrite()!.payload).toMatchObject({ max_health: 130 });
  });

  it("drops the bonus for gear that is no longer equipped", async () => {
    // The drift case. max_health still carries a bonus from gear that has since
    // been removed — by the class-mismatch auto-unequip, for instance, which
    // never adjusted it. Deriving the value on load corrects it.
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 130 })]);
    setTable("user_inventory", []);

    renderProvider();

    await waitFor(() => expect(healthWrite()).toBeDefined());
    expect(healthWrite()!.payload).toMatchObject({ max_health: 120 });
  });

  it("writes nothing when the stored value is already correct", async () => {
    // Every profile load runs this. It must not write on the common path, or
    // opening the app would issue a pointless update every single time.
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 130, current_health: 50 })]);
    setTable("user_inventory", [gear("health", 10)]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(healthWrite()).toBeUndefined();
  });

  it("pulls current health down when the ceiling drops below it", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 100, max_health: 130, current_health: 130 })]);
    setTable("user_inventory", []);

    renderProvider();

    await waitFor(() => expect(healthWrite()).toBeDefined());
    expect(healthWrite()!.payload).toMatchObject({ max_health: 100, current_health: 100 });
  });

  it("does not heal the player when the ceiling rises", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 100, max_health: 100, current_health: 40 })]);
    setTable("user_inventory", [gear("health", 25)]);

    renderProvider();

    await waitFor(() => expect(healthWrite()).toBeDefined());
    expect(healthWrite()!.payload).toMatchObject({ max_health: 125, current_health: 40 });
  });

  it("ignores gear whose bonus is not health", async () => {
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 120 })]);
    setTable("user_inventory", [gear("defense", 10), gear("currency", 5), gear("energeia", 3)]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(healthWrite()).toBeUndefined();
  });

  it("leaves a profile predating the column exactly as it is", async () => {
    // Until base_max_health.sql runs the column reads as null. Falling back to
    // a fresh 100 would reset a levelled player's ceiling the first time they
    // opened the app, so the base is derived backwards from what they have and
    // this becomes a no-op.
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: null, max_health: 300, current_health: 300 })]);
    setTable("user_inventory", [gear("health", 10)]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(healthWrite()).toBeUndefined();
  });

  it("writes nothing when the equipped query failed", async () => {
    // A failed query returns null, which looks exactly like an empty loadout.
    // Deriving from it would strip every bonus out of max_health and clamp
    // current_health down to match, and the clamp does not come back.
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 130, current_health: 130 })]);
    setTableError("user_inventory", new Error("offline"));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(healthWrite()).toBeUndefined();
  });

  it("writes nothing when current health is not a number", async () => {
    // Otherwise a player who nulled their own current_health would reload into
    // a full heal.
    setSession("user-1");
    setTable("profiles", [profileRow({ base_max_health: 120, max_health: 120, current_health: null })]);
    setTable("user_inventory", [gear("health", 10)]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("Brother Chad"));
    expect(healthWrite()).toBeUndefined();
  });
});
