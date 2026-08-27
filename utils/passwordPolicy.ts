/**
 * The app's own password floor.
 *
 * Supabase's leaked-password check (HaveIBeenPwned) is a Pro plan feature and
 * this project is on the free tier, so this length rule plus whatever Supabase
 * enforces by default is the whole policy. That makes it worth applying at
 * every point a password is chosen rather than most of them.
 *
 * Deliberately not applied when signing IN. Someone whose existing password is
 * shorter than the current floor still needs to get into their own account, and
 * rejecting it locally would lock them out with a message that blames them for
 * a rule that did not exist when they signed up. Let the server decide there.
 */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordCheck =
  | { valid: true }
  | { valid: false; error: string };

/** Checks a newly chosen password: signup, reset, and change all share this. */
export function checkNewPassword(password: string, confirm?: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (confirm !== undefined && password !== confirm) {
    return { valid: false, error: "The two passwords don't match." };
  }
  return { valid: true };
}
