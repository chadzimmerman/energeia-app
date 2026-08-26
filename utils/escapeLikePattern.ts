/**
 * Escapes the wildcards Postgres reads inside a LIKE / ILIKE pattern.
 *
 * PostgREST passes the value as a parameter, so this is not about injection —
 * the value can never become filter syntax. It is about the pattern language:
 * `%` matches any run of characters and `_` matches any single one, so a name
 * like "100%" or "a_b" silently matches rows it has nothing to do with.
 *
 * Postgres uses backslash as the default escape character, so the backslash
 * itself has to be escaped first — otherwise escaping "a\" would produce a
 * trailing escape with nothing after it.
 *
 * Use this whenever a user-supplied string is compared with .like() or .ilike()
 * and is meant to be matched literally.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
