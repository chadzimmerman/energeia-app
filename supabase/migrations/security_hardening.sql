-- ============================================================
-- ENERGEIA: Security Hardening
--
-- Closes the two items left open from the 2026-05-28 Supabase
-- Security Advisor pass (issue #6), plus the database-side half
-- of two findings from the code audit (see docs/SECURITY-AUDIT.md).
--
-- Read each section before running it. Section 3 can fail on
-- existing data by design — that is the point of the check.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Pin search_path on every function in public
--
-- A function without a pinned search_path resolves unqualified
-- names against the caller's search_path. A caller who puts a
-- schema of their own in front can shadow a table or operator
-- the function relies on and have it run their version instead.
-- This matters most for SECURITY DEFINER functions, which run
-- with the owner's rights.
--
-- Rather than list the functions by name, this fixes every one
-- that has not already pinned a path, so functions added later
-- can be caught by re-running it.
--
-- Uses `public, pg_temp` rather than the stricter `''` Supabase
-- suggests. Setting an empty search_path means every name inside
-- the function body must be schema-qualified, so a function that
-- says `FROM profiles` rather than `FROM public.profiles` starts
-- failing at runtime the moment it is applied — and these run from
-- triggers, where that failure surfaces as a broken signup rather
-- than an obvious error. `public, pg_temp` closes the advisor
-- warning without depending on how the bodies were written.
--
-- If you would rather have `''`, read each function body first and
-- qualify its references, then change it here.
-- ------------------------------------------------------------

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')          -- functions and procedures
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, '{}'::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    RAISE NOTICE 'Pinning search_path on %', fn.signature;
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      fn.signature
    );
  END LOOP;
END $$;

-- Verify: this should return no rows once the block above has run.
--
--   SELECT p.oid::regprocedure
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.prokind IN ('f','p')
--     AND NOT EXISTS (
--       SELECT 1 FROM unnest(coalesce(p.proconfig,'{}'::text[])) c
--       WHERE c LIKE 'search_path=%'
--     );


-- ------------------------------------------------------------
-- 2. Leaked password protection
--
-- Not settable from SQL. Turn it on in the dashboard:
--   Authentication -> Providers -> Email -> "Prevent use of
--   leaked passwords"
--
-- It checks new passwords against HaveIBeenPwned using a k-anonymity
-- prefix, so no password or full hash leaves the project.
--
-- This is the other half of issue #6 and has to be done by hand.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 3. Enforce username uniqueness in the database
--
-- app/(tabs)/settings/username.tsx checks for a duplicate with a
-- SELECT and then UPDATEs. Two users saving the same name at the
-- same time both see no conflict and both write, and the check
-- only works at all if the reader can see other users' rows.
--
-- A unique index settles it in one place, regardless of RLS.
-- Names are compared case-insensitively so "Chad" cannot be taken
-- alongside "chad".
--
-- This will FAIL if duplicates already exist. That is deliberate.
-- Find them first:
--
--   SELECT lower(username) AS name, count(*), array_agg(id)
--   FROM profiles
--   WHERE username IS NOT NULL
--   GROUP BY lower(username)
--   HAVING count(*) > 1;
--
-- Resolve those rows, then run the index.
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON profiles (lower(username))
  WHERE username IS NOT NULL;

-- handle is derived from username and is what other members see,
-- so it needs the same guarantee.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_key
  ON profiles (lower(handle))
  WHERE handle IS NOT NULL;


-- ------------------------------------------------------------
-- 4. Keep the group size cap out of the client
--
-- monastery.tsx counts members, compares against MAX_MEMBERS, and
-- then writes profiles.group_id. Two people joining at once both
-- pass the count, and nothing stops a direct write to group_id
-- from skipping the check entirely.
--
-- The trigger below enforces the cap on the row that actually
-- changes. Adjust the limit here if MAX_MEMBERS ever moves — and
-- note the constant lives in the client too.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_group_member_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  member_count integer;
BEGIN
  -- Only care when a row is actually joining a group
  IF NEW.group_id IS NULL
     OR (TG_OP = 'UPDATE' AND OLD.group_id IS NOT DISTINCT FROM NEW.group_id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO member_count
  FROM profiles
  WHERE group_id = NEW.group_id
    AND id <> NEW.id;

  IF member_count >= 4 THEN
    RAISE EXCEPTION 'Group % already has the maximum of 4 members', NEW.group_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_group_member_cap ON profiles;
CREATE TRIGGER profiles_group_member_cap
  BEFORE INSERT OR UPDATE OF group_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_group_member_cap();
