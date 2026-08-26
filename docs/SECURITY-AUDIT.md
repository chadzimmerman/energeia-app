# Security audit

Code audit of the client, 2026-08-26, against `development` at `bfadfc6`.
Complements the Supabase Security Advisor pass from 2026-05-28 (issue #6),
which covered database configuration rather than application code.

Findings are ordered by what an attacker gets, not by how hard they are to fix.

---

## The shape of the problem

Two facts set the boundary for everything below.

**The anon key is not a secret.** `EXPO_PUBLIC_*` variables are inlined into the
JavaScript bundle at build time, so the Supabase URL and anon key ship inside
every install and can be read out of the IPA in a few minutes. This is normal
and by design — but it means every guarantee has to hold against someone
calling the REST API directly with that key, not just against someone using
the app.

**There is no server-side application logic.** Every table is written directly
from the client. There are no RPCs and no edge functions. So for anything the
game needs to be true — you paid for that item, you earned that Energeia, that
habit is yours — the only enforcement available is an RLS policy. Where a rule
is expressed as an `if` in a `.tsx` file, it is a UI convenience, not a control.

That is a reasonable architecture for a solo project at open beta. It is worth
being explicit about it, because several findings below are the same root cause
wearing different clothes.

---

## Findings

### 1. Deep link accepted session tokens from the URL — **fixed**

`app/_layout.tsx` handled any URL containing `auth/callback`. Its last branch
read `access_token` and `refresh_token` out of the URL fragment and passed them
straight to `supabase.auth.setSession()`.

Nothing distinguished a link Supabase sent from a link anyone else wrote. A web
page, a QR code, or a message containing

```
energeiaapp://auth/callback#access_token=<attacker>&refresh_token=<attacker>
```

would silently sign the victim into an account the attacker controls. The app
shows no account name on the habits screen, so there is no obvious cue that
anything changed. Every habit, log, and journal note the victim then wrote would
land in the attacker's account, to be read at leisure.

The other two branches were never vulnerable. `exchangeCodeForSession` needs the
PKCE verifier held on the device, and `verifyOtp` validates the hash server-side
against the address it was issued for.

**Fixed** by removing the fragment branch and pinning `flowType: 'pkce'` on the
client, so real email links arrive as `?code=` and take the safe path. The OTP
`type` is now checked against the known set instead of being cast with `as any`.

> Needs a real device test before shipping — this changes the format of every
> email link the project sends. It folds into issue #4, which already asks for
> an email auth pass on the next TestFlight build.

### 2. Password reset never returned to the app — **fixed**

`resetPasswordForEmail` passed `redirectTo: "https://pnhfekszpoaeelbbvtyw.supabase.co"`
— the project host — while signup correctly used `energeiaapp://auth/callback`.
The reset link dropped the user on a Supabase page, the app's callback handler
never ran, and the reset could not complete.

Not an attack, but it means forgot-password has never worked. **Fixed** by using
the app scheme in both places.

The redirect turned out to be only half of it. Following a recovery link signs
the user in — that is how Supabase recovery works — but a session is not what
they came for. There was nowhere to set a new password: the only password UI,
`settings/password.tsx`, re-authenticates with the current password first, which
is precisely the thing a person following a reset link does not have. So the
fixed link would have delivered them to the habits tab, signed in, still locked
out of their own password.

Added `app/reset-password.tsx` and routing for it. The `PASSWORD_RECOVERY` auth
event and `type=recovery` links both land there, and the router holds them there
until the password is actually changed, so a reset cannot quietly degrade into a
plain sign-in.

Deep-link failures are also reported now. `exchangeCodeForSession` and
`verifyOtp` errors were discarded, and with the implicit fallback removed an
expired link or one opened on a different device from the one that requested it
failed in total silence.

Together these are the concrete answer to issue #4.

### 3. Currency is written as an absolute value — **open, needs a decision**

`app/(tabs)/settings/market.tsx` reads the balance, subtracts the price on the
client, and writes the result back:

```ts
const newBalance = playerEnergeia - item.price;
// ...
await supabase.from("profiles")
  .update({ energeia_currency: newBalance })   // absolute, not a decrement
  .eq("id", userId);
```

Two consequences, one ordinary and one adversarial.

The ordinary one is a lost update, and it does not need an attacker. All the DB
work runs in a background async block *after* the user has already been told
"Purchase Successful!". If a habit completes in that window — plausible, since
scoring a habit also writes `energeia_currency` — whichever write lands second
wins and the other is erased. Users will report this as "my Energeia
disappeared" or "I got the item for free", intermittently, and it will be hard
to reproduce.

The adversarial one is that price and balance arithmetic happens entirely on the
client, so anyone with the anon key can set `energeia_currency` to whatever they
like. There is no RLS policy that can express "this new balance is the old one
minus the price of a thing you actually bought".

The fix for both is the same: move the purchase into a `SECURITY DEFINER` RPC
that reads the price from `items_master`, checks the balance, inserts the
inventory row, and decrements — in one statement, in one transaction. That is a
design change touching the market screen, so it is written up rather than
applied here.

Interim mitigation applied: `handleBuy` now re-checks affordability. It already
re-checked `isLocked`, so the omission was an inconsistency, and with an absolute
write a stale balance pushes the stored value negative.

### 4. Username uniqueness cannot work as written — **partly fixed**

`settings/username.tsx` does a `SELECT` for a matching name and then an `UPDATE`.
Two problems, and they point in opposite directions:

- It is check-then-act with no constraint behind it, so two users claiming the
  same name at once both pass.
- It only finds anything if the reader can see *other users' rows*. If RLS
  restricts `profiles` to the owner — which is what you would want — the query
  always returns empty and uniqueness is silently never enforced. If RLS is open
  enough for it to work, then usernames are enumerable.

Which of those is true cannot be determined from the repository, because the
policies are not in it (see finding 7).

The input was also passed straight to `.ilike()`, where `%` and `_` are
wildcards, so claiming a name containing either matched unrelated rows and gave
a false "Name Taken". Escaping those turned out not to be enough either:
PostgREST rewrites `*` to `%` in `like`/`ilike` values before Postgres sees
them, so a literal `*` cannot be matched through that operator at all.

**Fixed by deleting the pre-check.** Escaping a query that cannot be correct in
principle is not worth doing well. The unique indexes on `lower(username)` and
`lower(handle)` are now the authority and the write is the check —
`utils/profileErrors.ts` turns a `23505` violation into a message worth showing.

Two call sites needed it, not one. `onboarding.tsx` had no uniqueness check at
all and only `console.error`d failures, so once the indexes exist a duplicate
name would have made "Begin Journey" do nothing at all, silently, on the first
screen of the app. It reports properly now.

Also worth noting: `handle` is derived from `username`, so "Chad Z" and "Chad_Z"
are distinct usernames that collide on `handle`. Both indexes map to the same
player-facing message.

### 5. Group membership cap is client-side only — **SQL provided**

`monastery.tsx` counts members, compares against `MAX_MEMBERS = 4`, then writes
`profiles.group_id`. Check-then-act again, and a direct write to `group_id`
skips it entirely. Joining a group grants read access to every member's
`handle`, `player_class`, `level`, `current_health`, and `character_image_path`.

Related: invite codes are 6 characters and looked up with
`.eq("invite_code", code)`, which requires a policy allowing anyone to read
`groups` by code. Whether that space is meaningfully large depends on how the
code is generated — which, again, is not in the repository.

A `BEFORE INSERT OR UPDATE` trigger enforcing the cap is in
`security_hardening.sql` §4.

The May Security Advisor pass already recorded two always-true policies in this
area and deferred them until the group feature was built. It now is:

- `group_story_progress` — "Anyone can update group progress", `USING (true)`.
  Any authenticated user can advance, or reset, any group's quest progress,
  including groups they are not in.
- `groups` — "Users can create groups", `WITH CHECK (true)`.

These are worth scoping at the same time as the trigger above. They are the one
place where the audit found a policy that is known to be permissive rather than
merely unverifiable.

### 6. PostgREST filter interpolation — **fixed**

`market.tsx` built filter strings by interpolation:

```ts
itemQuery.or(`required_class.is.null,required_class.eq.${cls}`)
```

`cls` derives from `profiles.player_class`, a column the user can write to their
own row. A comma or dot in that value is read as filter syntax and changes which
rows come back. Impact is low — `items_master` is a public catalogue and the
worst outcome is seeing items intended for another class — but the pattern is
worth not having.

**Fixed** by stripping everything outside `a-z` before interpolation. The
`playerGender` interpolation next to it was already safe: it is the result of a
ternary that can only produce `"male"` or `"female"`.

### 7. Schema and RLS policies are not in version control — **open (issue #31)**

This is the finding that makes several of the others unanswerable.

Of 13 tables, one has a `CREATE TABLE` in the repo and none have a
`CREATE POLICY`. The entire authorization system — the only real control this
architecture has — exists solely as dashboard state. It cannot be reviewed in a
PR, diffed when it changes, restored after a mistake, or tested.

Concretely, this audit could not determine:

- whether `profiles` is readable across users (finding 4 depends on it)
- whether `groups` is readable by anyone holding a code (finding 5)
- whether `feedback` accepts inserts from unauthenticated callers
- whether the ~8 writes keyed only by row id are actually constrained

Those writes are worth listing, since they are the ones with nothing but RLS
between them and another user's row:

| File | Line | Statement |
|---|---|---|
| `app/(tabs)/index.tsx` | 690 | `user_inventory.delete().eq("id", victim.id)` |
| `app/(tabs)/items-tab.tsx` | 480, 656, 668 | `user_inventory.delete().eq("id", item.id)` |
| `app/(tabs)/settings/monastery.tsx` | 336 | `user_inventory.delete().eq("id", scroll.inventoryId)` |
| `app/(tabs)/settings/stable.tsx` | 442 | `user_inventory.update(...).eq("id", inv.id)` |
| `contexts/ProfileContext.tsx` | 135, 213 | `user_inventory.update(...)` by id |

If the policies are right, these are all fine. The point is that "if" is
currently unverifiable, and one dashboard misclick away from being wrong.

**`supabase db pull` before open beta.** It is one command and it is the highest
value item in this document.

### 8. Smaller items

- **`.env` was not gitignored.** `.env.local` and `.env*.local` were covered but
  a plain `.env` was not. Nothing has ever been committed — history is clean —
  but that is the file a real key would land in. **Fixed.**
- **Raw error text shown to users.** Many handlers do `Alert.alert("Error", e.message)`,
  surfacing Postgres constraint and column names. Minor disclosure; worth a
  generic message with the detail sent to logs.
- **Feedback accepts a null `user_id`.** `about.tsx` inserts with
  `session?.user.id ?? null`. If the RLS insert policy allows anonymous rows this
  is spammable, and there is no length cap on `message`.
- **Self-inflicted data wipe is reachable.** `utils/migrations.ts` keys off
  `profiles.data_version`, a client-writable column. Setting it back to 0 re-runs
  the alpha→beta wipe. Only affects the user's own account, so this is a
  durability note rather than a vulnerability.

### 9. Checked and clean

- No secret has ever been committed (`git log --all -- .env*` is empty).
- No token, password, email, or session object reaches `console.*` — all 23
  logging statements were reviewed.
- `.ilike()` passes its argument as a parameter rather than interpolating it, so
  the wildcard issue in finding 4 was a correctness bug, not injection.
- The PKCE and OTP deep-link branches were sound before this audit.
- `grantAchievement` upserts on a composite key and is safe to call repeatedly.
- No `eval`, and no dynamic `require` — every `require()` path is a static
  string literal, as Metro demands.
- The one `dangerouslySetInnerHTML`, at `app/+html.tsx:22`, is stock Expo
  Router scaffolding: a hardcoded CSS constant, web-only, with no user input
  reaching it. Worth knowing it is there; nothing to do about it.

---

## What to do next, in order

1. **`supabase db pull`** and commit the result (issue #31). Everything else is
   guesswork until this exists.
2. **Run `security_hardening.sql`.** Closes issue #6 and findings 4 and 5.
   Section 3 will fail if duplicate usernames already exist — that is intended;
   the query to find them is in the file. Run it *after* deploying the app
   change, not before: the constraint-violation handling in `username.tsx` and
   `onboarding.tsx` is what turns a rejected name into a message rather than a
   dead button.
3. **Turn on leaked password protection** in the dashboard. Manual, ~30 seconds.
4. **Test email auth on a device** (issue #4). Findings 1 and 2 both change how
   email links behave and neither has been exercised on a real build.
5. **Move purchases into an RPC** (finding 3). The largest piece of work here,
   and the only one that is also a bug users will hit on their own.
