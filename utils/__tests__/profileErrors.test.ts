import type { PostgrestError } from "@supabase/supabase-js";
import { UNIQUE_VIOLATION, isDuplicateNameError } from "../profileErrors";

const err = (over: Partial<PostgrestError>): PostgrestError =>
  ({ code: "", message: "", details: "", hint: "", name: "PostgrestError", ...over }) as PostgrestError;

describe("isDuplicateNameError", () => {
  it("recognises a username collision", () => {
    expect(isDuplicateNameError(err({
      code: UNIQUE_VIOLATION,
      message: 'duplicate key value violates unique constraint "profiles_username_lower_key"',
    }))).toBe(true);
  });

  it("recognises a handle collision", () => {
    // handle is derived from username, so "Chad Z" and "Chad_Z" collide here
    // while looking like different usernames.
    expect(isDuplicateNameError(err({
      code: UNIQUE_VIOLATION,
      message: 'duplicate key value violates unique constraint "profiles_handle_lower_key"',
    }))).toBe(true);
  });

  it("reads the details field when the message does not name the constraint", () => {
    expect(isDuplicateNameError(err({
      code: UNIQUE_VIOLATION,
      message: "duplicate key value violates unique constraint",
      details: "Key (lower(handle))=(brother_chad) already exists.",
    }))).toBe(true);
  });

  it("ignores a unique violation on some other column", () => {
    // Not every 23505 is a name. Swallowing an unrelated one would show the
    // player a misleading message and hide a real failure.
    expect(isDuplicateNameError(err({
      code: UNIQUE_VIOLATION,
      message: 'duplicate key value violates unique constraint "user_inventory_pkey"',
    }))).toBe(false);
  });

  it("ignores errors that are not unique violations", () => {
    expect(isDuplicateNameError(err({
      code: "42501",
      message: "new row violates row-level security policy for table username",
    }))).toBe(false);
  });

  it("is false for no error at all", () => {
    expect(isDuplicateNameError(null)).toBe(false);
    expect(isDuplicateNameError(undefined)).toBe(false);
  });

  it("survives an error with null message and details", () => {
    expect(isDuplicateNameError(err({
      code: UNIQUE_VIOLATION,
      message: null as unknown as string,
      details: null as unknown as string,
    }))).toBe(false);
  });
});
