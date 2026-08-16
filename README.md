# Energe.ia

**A habit tracker built as a medieval RPG. React Native, Expo, and Postgres. Shipping to the App Store when the last art assets land.**

Most habit trackers are a checklist with a number attached. Energe.ia makes the
number a character. Complete a habit and you earn currency, experience, and
equipment. Fall into a bad habit and you take damage. Reach zero health and you
lose your level, your currency, and a random item.

The theme comes from Eastern Orthodox theology. *Energeia* means the divine
energies, the outward expression of grace. Your character renders what your real
choices earned.

<!-- SCREENSHOTS: replace when final art lands
<p align="center">
  <img src="docs/screens/01-character.png" width="240">
  <img src="docs/screens/02-habits.png" width="240">
  <img src="docs/screens/03-stable.png" width="240">
</p>
-->

---

## What it does

- **Four character classes** with distinct stat bonuses. A Monk earns more experience, a Noble earns more currency.
- **Four-state habit logging.** Complete, tempted, failed, or skipped. The middle state matters, and most trackers do not have it.
- **Streaks on daily, weekly, or monthly cycles.** Each frequency defines "kept the streak" differently.
- **Layered equipment.** Five slots composite onto the character sprite in a fixed render order.
- **A stable of animal companions**, renamable, drawn from 14 pixel-art species.
- **Seasonal quest arcs.** Four story lines, three parts each, with items that drop on habit completion.
- **Death and resurrection.** Zero health resets your progress. The theme carries the mechanic.
- **26 achievements**, granted server-side.
- **Seasonal theming.** The entire palette, header art, and splash screen change with the meteorological season.

## Scope

| | |
|---|---|
| **Application code** | ~13,900 lines across TypeScript, TSX, and SQL |
| **Routes** | 25 screens on Expo Router, file-based routing |
| **Backend** | 13 Postgres tables on Supabase, row level security on every one |
| **Art pipeline** | 171 pixel-art sprites, statically resolved for the bundler |
| **Platform** | Expo SDK 55, React 19.2, React Native 0.83 |
| **Built by** | One engineer, 69 commits, ESLint clean |

---

## Engineering

### Streaks are derived, never incremented

The obvious way to track a streak is a counter. Increment on success, reset on
failure. That counter drifts. A user edits a past day in the calendar, and the
counter no longer matches the history it claims to summarize.

`recomputeStreak` throws the counter away and rebuilds the streak from the log
every time the calendar changes. The function is idempotent. It cannot drift,
because it holds no state of its own.

The four log states are the reason this is not trivial:

```ts
/**
 * green  → counts toward streak (increment)
 * orange → tempted but held on; neutral, does not increment OR break streak
 * red    → failure; breaks streak
 * grey / no row → gap; today is allowed to be unlogged without breaking streak
 */
```

`orange` is the product decision that drove the design. A user who wanted to
skip a workout and went anyway has not broken a streak, and has not extended one
either. Binary trackers cannot express that, so they punish honesty. Adding a
neutral state means the streak walk has to distinguish "no data" from "data that
does not count," across three reset frequencies.

Daily walks backward one day at a time. Weekly rewinds to Monday and asks whether
any day in that week was green. Monthly does the same across a calendar month
with a variable day count. Each frequency ends the walk on the first red and
clamps the floor at -1.

### The version gate fails open

A remote configuration row sets the minimum supported app version. Clients below
it get a blocking update modal.

The interesting line is the error path:

```ts
// Returns true if the running version meets the minimum, false if an update is
// required. On any error (no config row, network failure) returns true so the
// gate never false-blocks.
```

A version gate that fails closed will brick every install the moment the config
query fails. Airport wifi becomes an outage. The gate exists to stop a known-bad
build, so an unknown state must resolve to "let them in." Fail open is the only
safe default when the check itself is the risk.

### Per-user data migrations run on the client

There is no migration runner between an app update and a user's rows. Schema
changes are easy; the user's *data* is the hard part.

A `data_version` column on each profile tracks which migrations have run. On
launch, any migration above that version executes, then the version is written
back. Each migration states exactly what it destroys and what it preserves:

```ts
// Alpha → open beta reset. Items and quests changed significantly between
// builds, so existing inventory and quest progress are wiped. Habits, logs,
// level, XP, class, and character appearance are all preserved.
```

Writing the preservation policy in the migration itself is deliberate. The list
of what survives is a product promise, and it belongs next to the code that
enforces it rather than in a changelog nobody reads.

### Equipment compositing is a z-order problem

A dressed character is five sprites drawn in sequence. Order is not cosmetic. A
crown behind a head is a bug.

The order is encoded in the database rather than the client, so the app renders
whatever it is given without a hardcoded list:

```
character_body    robes, stoles, kaftans        renders first, behind
character_neck    crosses, necklaces
character_hand    swords, staves, scepters
character_shield  shields, orbs, offhand
character_head    hats, crowns, tiaras          renders last, on top
```

Slots also enforce a one-item-per-slot rule, so equipping a second crown swaps
rather than stacks.

### The bundler shapes the art pipeline

Metro resolves `require()` at build time, so image paths must be static strings.
A dynamic path silently returns undefined and the sprite disappears.

Every sprite therefore passes through an explicit map with a fallback, and remote
URLs are handled separately from bundled assets:

```ts
const resolveAnimalImage = (key: string): ImageSourcePropType => {
  if (key.startsWith("http")) return { uri: key };
  return ANIMAL_IMAGE_MAP[key] ?? ANIMAL_IMAGE_MAP["puppy"];
};
```

The fallback matters more than it looks. Server-driven content can name a sprite
that a given client build does not have. A missing key renders a default instead
of an empty box, so an older install degrades rather than breaks.

### Authorization lives in Postgres

Supabase exposes the database to the client directly. Row level security is the
authorization boundary, not application code. Every one of the 13 tables carries
policies, and a user reaches only their own rows.

Server-authoritative grants follow from that. `grantAchievement` writes to
`user_achievements` under policy rather than trusting a client-side check.

---

## Stack

**Expo SDK 55** with **Expo Router** for file-based routing. **React 19.2** and
**React Native 0.83**. **TypeScript**, strict. **Supabase** for auth, Postgres,
and row level security. **Reanimated 4** for character and UI animation.
**EAS Build** for iOS.

## Status

| | |
|---|---|
| Build | Closed alpha, feature complete |
| Blocking launch | Three commissioned art assets |
| Platform | iOS first, Android to follow |
| Backend | Deployed |

Source is private while the app is pre-launch. Available to hiring managers on
request.
