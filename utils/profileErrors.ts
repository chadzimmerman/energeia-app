import type { PostgrestError } from "@supabase/supabase-js";

/** Postgres unique_violation. */
export const UNIQUE_VIOLATION = "23505";

/**
 * Whether a failed profile write was rejected for a name someone else holds.
 *
 * Username uniqueness is enforced by unique indexes on lower(username) and
 * lower(handle), not by checking first. A check-then-write cannot be correct
 * here: two users saving the same name at once both see it free, and the check
 * only finds anything if it can read other users' rows in the first place.
 *
 * So the write is the check. This turns the constraint violation into something
 * worth showing a player, and lets anything else fail loudly.
 *
 * Both indexes map to the same message. handle is derived from username, so
 * "Chad Z" and "Chad_Z" collide on handle while looking distinct as usernames —
 * from the player's side that is still just a name someone already has.
 */
export function isDuplicateNameError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  if (error.code !== UNIQUE_VIOLATION) return false;

  const detail = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return detail.includes("username") || detail.includes("handle");
}

/** What to show a player whose chosen name is taken. */
export const DUPLICATE_NAME_MESSAGE =
  "That name is already taken. Please choose another.";
