import { ImageSourcePropType } from "react-native";

// ── Local item image map ──────────────────────────────────────────────────────
// Store the image_path DB key as the record key (no extension).
// Metro requires static require() paths — add new items here as art arrives.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ITEM_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  // ── Existing items (bundled locally for faster loading) ───────────────────
  "bone-relic":         require("../assets/sprites/items/bone-relic.png"),
  candle:               require("../assets/sprites/items/candle.png"),
  chotki:               require("../assets/sprites/items/chotki.png"),
  "great-schema-robes": require("../assets/sprites/items/great-schema-robes.png"),
  incense:              require("../assets/sprites/items/incense.png"),
  philokalia:           require("../assets/sprites/items/philokalia.png"),
  "prosphora-bread":    require("../assets/sprites/items/prosphora-bread.jpg"),
  "relic-skull":        require("../assets/sprites/items/relic-skull.png"),
  shield:               require("../assets/sprites/items/shield.png"),
  sword:                require("../assets/sprites/items/sword.png"),
  "warrior-helmet":     require("../assets/sprites/items/warrior-helmet.png"),

  // ── Noble female items ────────────────────────────────────────────────────
  "noble-female-tiara":    require("../assets/sprites/items/noble-female-tiara.png"),
  "noble-princess-mirror": require("../assets/sprites/items/noble-princess-mirror.png"),

  // ── Quest items (scrolls, drops) ─────────────────────────────────────────
  "help-wanted-scroll": require("../assets/sprites/quests/quest-scroll-temp.jpg"),

  // ── Spring 2026 seasonal items ────────────────────────────────────────────
  "spring-kokoshnik-2026":    require("../assets/sprites/items/spring-kokoshnik-2026.png"),
  "temp-princess-spring-dress": require("../assets/sprites/items/temp-princess-spring-dress.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  "temp-spring-monk-stole":   require("../assets/sprites/items/temp-spring-20266-monk-Stole-of-the Life-Giver.png"),
  "temp-spring-shield-2026":  require("../assets/sprites/items/temp-spring-shield-2026.png"),
};

/**
 * Resolves an item image_path key to the correct local asset.
 * Falls back to remote URI for existing Supabase Storage URLs.
 */
export const resolveItemImage = (path: string | null | undefined): ImageSourcePropType => {
  if (!path) return ITEM_IMAGE_MAP.candle; // generic fallback
  if (path.startsWith("http")) return { uri: path };
  return ITEM_IMAGE_MAP[path] ?? { uri: path };
};
