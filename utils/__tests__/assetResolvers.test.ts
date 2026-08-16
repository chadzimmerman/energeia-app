import { resolveCharacterImage } from "../resolveCharacterImage";
import { resolveItemImage, resolveCharacterSetImage } from "../resolveItemImage";
import { BACKGROUND_COLORS, DEFAULT_BG } from "../backgroundColors";

/**
 * Sprite lookup is server-driven: the database names an image and the client
 * resolves it against a bundled map. That map only contains what this build
 * shipped with, so an older install will be handed keys it has never heard of.
 *
 * Every one of these tests is really the same test. An unknown key must render
 * something. Returning undefined puts a blank rectangle where the character is,
 * which reads as a broken app rather than a missing sprite.
 */

describe("resolveCharacterImage", () => {
  it("resolves a known class and gender", () => {
    expect(resolveCharacterImage("monk_male", 0)).toBeDefined();
  });

  it("falls back when the key is unknown", () => {
    expect(resolveCharacterImage("wizard_of_the_ninth_house", 0)).toBeDefined();
  });

  it("falls back when the path is null", () => {
    expect(resolveCharacterImage(null)).toBeDefined();
  });

  it("falls back when the path is undefined", () => {
    expect(resolveCharacterImage(undefined)).toBeDefined();
  });

  it("falls back on an empty string", () => {
    expect(resolveCharacterImage("")).toBeDefined();
  });

  it("passes remote URLs through as a uri source", () => {
    expect(resolveCharacterImage("https://cdn.example.com/hero.png")).toEqual({
      uri: "https://cdn.example.com/hero.png",
    });
  });

  it("maps the legacy novice monk path to the current sprite", () => {
    // Old rows still carry a filename rather than a key. They must not fall
    // through to the generic placeholder, which is a different character.
    expect(resolveCharacterImage("assets/novice-monk-male.png")).toBe(
      resolveCharacterImage("monk_male", 0),
    );
  });

  it("returns a sprite at every level tier boundary", () => {
    // young 0-19, adult 20-39, elder 40+. An off-by-one at a boundary shows up
    // as a character that vanishes on the level-up screen.
    for (const level of [0, 19, 20, 39, 40, 99, 1000]) {
      expect(resolveCharacterImage("monk_male", level)).toBeDefined();
    }
  });

  it("defaults to the young tier when no level is given", () => {
    expect(resolveCharacterImage("monk_male")).toBe(resolveCharacterImage("monk_male", 0));
  });

  it("survives a negative level", () => {
    expect(resolveCharacterImage("monk_male", -5)).toBeDefined();
  });

  it("resolves every class and gender combination", () => {
    const classes = ["monk", "fighter", "noble", "princess"];
    for (const cls of classes) {
      for (const gender of ["male", "female"]) {
        for (const level of [0, 25, 50]) {
          expect(resolveCharacterImage(`${cls}_${gender}`, level)).toBeDefined();
        }
      }
    }
  });
});

describe("resolveItemImage", () => {
  it("falls back to a placeholder for an unknown path", () => {
    expect(resolveItemImage("items/not-shipped-in-this-build.png")).toBeDefined();
  });

  it("falls back on null", () => {
    expect(resolveItemImage(null)).toBeDefined();
  });

  it("falls back on undefined", () => {
    expect(resolveItemImage(undefined)).toBeDefined();
  });

  it("falls back on an empty string", () => {
    expect(resolveItemImage("")).toBeDefined();
  });

  it("never returns undefined for any input", () => {
    const inputs = ["", " ", "../../etc/passwd", "🐟", "a".repeat(500), "http://x.png"];
    for (const input of inputs) {
      expect(resolveItemImage(input)).toBeDefined();
    }
  });
});

describe("resolveCharacterSetImage", () => {
  it("returns null for an unknown set, rather than a wrong sprite", () => {
    // This one deliberately does NOT fall back to a placeholder. A character set
    // overlay that cannot be found should draw nothing, because drawing the
    // wrong overlay on top of a character is worse than drawing none.
    expect(resolveCharacterSetImage("sets/unknown.png")).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(resolveCharacterSetImage(null)).toBeNull();
    expect(resolveCharacterSetImage(undefined)).toBeNull();
  });
});

describe("BACKGROUND_COLORS", () => {
  it("gives every background a wall and a floor", () => {
    for (const [key, value] of Object.entries(BACKGROUND_COLORS)) {
      expect(value.wall).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(value.floor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(key).toMatch(/^bg-/);
    }
  });

  it("covers all four seasons plus a neutral default", () => {
    for (const key of ["bg-grey", "bg-spring", "bg-summer", "bg-autumn", "bg-winter"]) {
      expect(BACKGROUND_COLORS[key]).toBeDefined();
    }
  });

  it("keeps wall and floor distinct in every background", () => {
    for (const value of Object.values(BACKGROUND_COLORS)) {
      expect(value.wall).not.toBe(value.floor);
    }
  });

  it("exposes a transparent default for an unowned background", () => {
    expect(DEFAULT_BG.wall).toBe("transparent");
    expect(DEFAULT_BG.floor).toBe("transparent");
  });
});
