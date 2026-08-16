# Testing roadmap

Where the tests are, where they are going, and the order to build them in.

Tiers are ordered by **blast radius**, not by how much coverage they add. A bug
in tier 1 leaks another user's data. A bug in tier 5 misaligns a sprite. Work
down the list, not across it.

Each tier is a week or two of evenings. None of them depend on the tier after.

---

## Where it stands

| Area | Files | Coverage |
|---|---|---|
| `utils/` | 10 | **98% statements** |
| `data/` | 1 | **100%** |
| `contexts/` | 1 | 0% |
| `components/` | 15 | 0% |
| `app/` (routes) | 25 | 0% |
| Postgres RLS policies | 13 tables | **not tested at all** |

118 tests, 8 suites. Run with `npm test`, `npm run test:coverage`.

---

## Tier 1. Pure logic ✅ done

Streak walk, version gate, migrations, asset resolvers, achievements.

The pattern worth repeating: **anything that computes gets separated from
anything that talks to Supabase.** `computeStreak` is pure and takes an injected
clock; `recomputeStreak` is three lines of I/O around it. Every tier below gets
easier when new logic is written this way from the start.

---

## Tier 2. Row level security

**Do this next. It is the only tier where a bug is a breach.**

Supabase exposes Postgres directly to the client. RLS policies are the entire
authorization system, exactly the way security rules are in a Firebase app.
Application code cannot save you, because the client can issue any query it
likes.

Right now nothing verifies those policies. They were written once and have never
been proven.

### Setup

```bash
supabase start          # local Postgres with the real policies applied
npm i -D @supabase/supabase-js dotenv
```

Tests sign in as two real users against the local instance and assert what each
can reach. Add `npm run test:rls` and a second CI job.

### The cases, per table

For each of the 13 tables, four questions:

- [ ] An owner can read their own rows
- [ ] A second user **cannot** read the first user's rows
- [ ] A second user **cannot** write to the first user's rows
- [ ] An anonymous client **cannot** read anything

Then the specific ones that matter more than the generic sweep:

- [ ] `profiles`: a user cannot raise their own `level`, `energeia_currency`, or `data_version` (privilege and economy escalation)
- [ ] `user_achievements`: a user cannot grant themselves an achievement directly
- [ ] `user_inventory`: a user cannot insert an item they never bought
- [ ] `habit_logs`: a user cannot write a log against another user's habit id
- [ ] `user_habits`: a user cannot set `streak_level` directly, bypassing the derivation
- [ ] `items_master`, `app_config`, `seasonal_stories`: readable by all, writable by none
- [ ] `groups` / `group_quests` / `group_story_progress`: a non-member cannot read a group's rows
- [ ] **Every table has an explicit `delete` policy.** Postgres denies by default, so a missing delete policy fails silently, and silent is how this bug class always presents.

> The last one has already bitten this codebase's sibling project three times.
> Create and update never imply delete.

---

## Tier 3. Components

Pure rendering, props in and output out. No Supabase, no navigation.

Build these with `@testing-library/react-native`. Assert on what a user sees,
using `getByText` and accessibility roles, never on internal state.

- [ ] `HabitItem`: the four streak tiers and their thresholds: red below 0, yellow at 0, green 1 to 6, blue at 7 and above. Difficulty 1 to 10 rendering. Press handlers fire once.
- [ ] `CharacterStats`: health and energeia bars at 0%, 50%, 100%, and over 100%. Level display. A zero-health state must render, because that is the frame right before the death modal.
- [ ] `AchievementItem`: earned shows art, unearned shows the shared blank.
- [ ] `HabitList`: ordering, empty state, and that reorder emits the new order rather than mutating in place.
- [ ] `ForceUpdateModal`: renders its message and offers no dismissal path.
- [ ] `BgColorSwatch`, `StyledText`, `Themed`: trivial, and cheap coverage.
- [ ] `TutorialOverlay`: 575 lines and the largest untested component. Step advancement, the final step dismissing, and that a skip does not leave the overlay mounted.

**Do not write snapshot tests.** A snapshot passes until someone changes a
margin, then it fails without telling you what broke. Assert on behavior.

Expected after this tier: roughly 65% overall.

---

## Tier 4. Context

- [ ] `ProfileContext`: initial load, refresh, error state, and that sign-out clears the profile rather than leaving the previous user's data in memory.
- [ ] Loading state is cleared in a `finally`, so a thrown query cannot leave a permanent spinner.
- [ ] `useColorScheme`, `useClientOnlyValue`: trivial.

Expected after this tier: roughly 70%.

---

## Tier 5. Screens

**Build the mock factory first.** Without it every screen test rewrites the
Supabase chain by hand, which is where screen suites usually rot.

```ts
// test/supabaseMock.ts
mockTable('user_habits', [ /* rows */ ]);
mockTableError('user_habits', new Error('offline'));
```

Then, per screen, three tests: it renders with data, it renders empty, it
renders an error without crashing.

- [ ] `login`, `onboarding`: class and gender selection writes the right profile
- [ ] `(tabs)/index`: the habits list, completing a habit
- [ ] `(tabs)/calendar-tab`: log editing, and that a past edit triggers a streak recompute
- [ ] `(tabs)/items-tab`: equipping, the one-item-per-slot swap, background selection
- [ ] `settings/market`: buying with enough currency, and being refused without
- [ ] `settings/stable`: pet rename, the 14 species
- [ ] `settings/achievements`, `journey`, `monastery`, `seasonal-stories`
- [ ] `settings/subscription`, `about`, `password`, `username`
- [ ] `DeathModal`, `HabitEditModal`, `calendar-modal`

Expected after this tier: roughly 85%.

---

## Tier 6. Flows

Multi-step paths where each step already passes alone. These catch integration
bugs, not unit bugs.

- [ ] Complete a habit: currency rises, XP rises, streak recomputes, an achievement grants if it qualifies.
- [ ] Take damage to zero: death modal, level reset, currency wiped, exactly one random item lost.
- [ ] Launch on an old `data_version`: migration runs, version is written after, habits and logs survive.
- [ ] Equip a second item into a filled slot: the first is unequipped rather than both rendering.

---

## Coverage targets

Aim for a **ratchet, not a number**. The floor only ever goes up, and it goes up
when a tier lands rather than on a schedule.

```js
// jest.config.js: raise these as tiers complete
coverageThreshold: {
  global: { statements: 40, branches: 35, functions: 25, lines: 40 },
  './utils/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
}
```

| After tier | Global floor |
|---|---|
| 1 (now) | 40% |
| 3 | 65% |
| 4 | 70% |
| 5 | 85% |

**Stop at 85%.** The last 15% is error branches that cannot be reached without
contorting the code, and chasing 100% produces tests written to satisfy the
instrument rather than to catch bugs. `utils/` stays at 95% because that is
where the real logic lives.

## What not to test

- **Snapshots.** They fail on cosmetic changes and pass on broken behavior.
- **Style objects.** `StyleSheet.create` returning what it was given proves nothing.
- **Library behavior.** Reanimated, Expo Router, and the Supabase client are already tested by their authors.
- **Static data shape**, past the uniqueness and completeness checks that already exist for achievements.

## Conventions

- Tests live in `__tests__/` beside the code they cover.
- One behavior per `it`, and the name states the behavior, not the function: `"fails open when the query throws"`, not `"tests checkMinVersion"`.
- Any test touching dates injects the date. Never read the system clock.
- Comment the *why* on a non-obvious case, especially where the assertion encodes a product decision rather than a mechanical one.
