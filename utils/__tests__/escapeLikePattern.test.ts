import { escapeLikePattern } from "../escapeLikePattern";

describe("escapeLikePattern", () => {
  it("leaves an ordinary name untouched", () => {
    expect(escapeLikePattern("Brother Chad")).toBe("Brother Chad");
  });

  it("escapes the percent wildcard", () => {
    // Unescaped, "100%" as a pattern matches every name starting with "100".
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes the underscore wildcard", () => {
    // Unescaped, "a_b" matches "aXb" for any single X.
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes the backslash itself", () => {
    expect(escapeLikePattern("back\\slash")).toBe("back\\\\slash");
  });

  it("escapes a trailing backslash rather than leaving it dangling", () => {
    // If the backslash were not escaped first, this would end in a lone escape
    // character and Postgres would reject the pattern.
    expect(escapeLikePattern("trailing\\")).toBe("trailing\\\\");
  });

  it("escapes every wildcard in a string, not just the first", () => {
    expect(escapeLikePattern("%a_b%")).toBe("\\%a\\_b\\%");
  });

  it("handles a string that is nothing but wildcards", () => {
    expect(escapeLikePattern("%%%")).toBe("\\%\\%\\%");
  });

  it("returns an empty string unchanged", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("does not touch characters that are not pattern syntax", () => {
    expect(escapeLikePattern("O'Brien-Smith.jr+1")).toBe("O'Brien-Smith.jr+1");
  });
});
