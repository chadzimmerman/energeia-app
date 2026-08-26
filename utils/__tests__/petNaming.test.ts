import {
  MAX_PET_NAME_LENGTH,
  canRenamePet,
  isActualRename,
  resolvePetDisplayName,
  validatePetName,
} from "../petNaming";

describe("canRenamePet", () => {
  it("gives a non-subscriber their first rename free", () => {
    expect(canRenamePet(0, false)).toEqual({ allowed: true, reason: "free" });
  });

  it("blocks a non-subscriber's second rename", () => {
    expect(canRenamePet(1, false)).toEqual({ allowed: false, reason: "needs-subscription" });
  });

  it("keeps blocking however many renames have been used", () => {
    expect(canRenamePet(7, false).allowed).toBe(false);
  });

  it("lets a subscriber rename freely", () => {
    expect(canRenamePet(0, true)).toEqual({ allowed: true, reason: "subscriber" });
    expect(canRenamePet(1, true)).toEqual({ allowed: true, reason: "subscriber" });
    expect(canRenamePet(99, true)).toEqual({ allowed: true, reason: "subscriber" });
  });

  it("grants the free rename when the count is missing", () => {
    // Rows predating pet_rename_count read as null. Withholding the free rename
    // from an existing player would be the worse way to be wrong.
    expect(canRenamePet(null, false)).toEqual({ allowed: true, reason: "free" });
    expect(canRenamePet(undefined, false)).toEqual({ allowed: true, reason: "free" });
  });

  it("treats a negative count as unused rather than as credit", () => {
    expect(canRenamePet(-3, false)).toEqual({ allowed: true, reason: "free" });
  });
});

describe("validatePetName", () => {
  it("accepts an ordinary name and returns it trimmed", () => {
    expect(validatePetName("  Henry  ")).toEqual({ valid: true, name: "Henry" });
  });

  it("rejects an empty name", () => {
    expect(validatePetName("").valid).toBe(false);
  });

  it("rejects a name that is only whitespace", () => {
    expect(validatePetName("   ").valid).toBe(false);
  });

  it("accepts a name exactly at the limit", () => {
    const name = "a".repeat(MAX_PET_NAME_LENGTH);
    expect(validatePetName(name)).toEqual({ valid: true, name });
  });

  it("rejects a name one character over the limit", () => {
    expect(validatePetName("a".repeat(MAX_PET_NAME_LENGTH + 1)).valid).toBe(false);
  });

  it("measures length after trimming, so padding does not push it over", () => {
    const padded = `  ${"a".repeat(MAX_PET_NAME_LENGTH)}  `;
    expect(validatePetName(padded).valid).toBe(true);
  });

  it("allows punctuation and accents", () => {
    expect(validatePetName("Fr. Seraphim-Rose").valid).toBe(true);
    expect(validatePetName("Ágios").valid).toBe(true);
  });
});

describe("isActualRename", () => {
  it("is true when the name changes", () => {
    expect(isActualRename("Henry", "Basil")).toBe(true);
  });

  it("is false when the name is unchanged", () => {
    // Opening the editor and tapping save without typing must not burn the one
    // free rename a non-subscriber gets.
    expect(isActualRename("Henry", "Henry")).toBe(false);
  });

  it("ignores whitespace differences", () => {
    expect(isActualRename("Henry", "  Henry  ")).toBe(false);
  });

  it("is true when a pet had no name yet", () => {
    expect(isActualRename(null, "Henry")).toBe(true);
  });

  it("is case sensitive — changing capitalisation is a rename", () => {
    expect(isActualRename("henry", "Henry")).toBe(true);
  });
});

describe("resolvePetDisplayName", () => {
  it("prefers the pet's own name", () => {
    expect(resolvePetDisplayName("Basil", "Henry")).toBe("Basil");
  });

  it("falls back to the default when unnamed", () => {
    expect(resolvePetDisplayName(null, "Henry")).toBe("Henry");
    expect(resolvePetDisplayName(undefined, "Henry")).toBe("Henry");
  });

  it("falls back when the stored name is blank", () => {
    expect(resolvePetDisplayName("   ", "Henry")).toBe("Henry");
  });

  it("trims a stored name with padding", () => {
    expect(resolvePetDisplayName("  Basil  ", "Henry")).toBe("Basil");
  });
});
