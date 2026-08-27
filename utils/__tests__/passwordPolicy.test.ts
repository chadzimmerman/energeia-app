import { MIN_PASSWORD_LENGTH, checkNewPassword } from "../passwordPolicy";

describe("checkNewPassword", () => {
  it("accepts a password at the minimum length", () => {
    expect(checkNewPassword("a".repeat(MIN_PASSWORD_LENGTH))).toEqual({ valid: true });
  });

  it("rejects one character short", () => {
    expect(checkNewPassword("a".repeat(MIN_PASSWORD_LENGTH - 1)).valid).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(checkNewPassword("").valid).toBe(false);
  });

  it("counts characters literally, without trimming", () => {
    // Spaces are legitimate password characters — trimming would silently
    // change what the user typed and what they later have to type back.
    expect(checkNewPassword("  ab  cd").valid).toBe(true);
  });

  it("accepts a matching confirmation", () => {
    expect(checkNewPassword("correcthorse", "correcthorse")).toEqual({ valid: true });
  });

  it("rejects a mismatched confirmation", () => {
    expect(checkNewPassword("correcthorse", "correctHorse").valid).toBe(false);
  });

  it("checks length before the match, so the more useful error wins", () => {
    const result = checkNewPassword("short", "different");
    expect(result.valid).toBe(false);
    expect((result as { error: string }).error).toContain("characters");
  });

  it("skips the match check when no confirmation is supplied", () => {
    // Signup has a single password field.
    expect(checkNewPassword("correcthorse")).toEqual({ valid: true });
  });
});
