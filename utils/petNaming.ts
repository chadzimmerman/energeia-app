/**
 * Rules for naming an adopted animal.
 *
 * An animal arrives with the default name from its items_master row. The player
 * gets one free change. Renaming after that is a subscriber feature.
 *
 * The count of renames is what the rule reads, rather than comparing the
 * current name against the default — a player who renamed an animal and then
 * renamed it back to its default would otherwise get a second free change.
 */

/** Longest name the input accepts, and what the rule enforces. */
export const MAX_PET_NAME_LENGTH = 24;

export type RenameVerdict =
  | { allowed: true; reason: "free" | "subscriber" }
  | { allowed: false; reason: "needs-subscription" };

/**
 * Whether this player may rename this animal right now.
 *
 * A missing or negative count is treated as zero, so a row that predates
 * pet_rename_count grants the free rename rather than withholding it. Erring
 * toward letting the player name their pet is the right way to be wrong.
 */
export function canRenamePet(
  renameCount: number | null | undefined,
  isSubscriber: boolean,
): RenameVerdict {
  if (isSubscriber) return { allowed: true, reason: "subscriber" };

  const used = typeof renameCount === "number" && renameCount > 0 ? renameCount : 0;
  if (used === 0) return { allowed: true, reason: "free" };

  return { allowed: false, reason: "needs-subscription" };
}

/**
 * Whether this rename should spend the player's one free change.
 *
 * Only a rename taken *as a free user* does. A subscriber renaming freely must
 * not burn it, or someone who subscribes, renames, and later lapses lands on
 * canRenamePet(1, false) and is blocked — having never had a free rename as a
 * free user at all.
 */
export function consumesFreeRename(verdict: RenameVerdict): boolean {
  return verdict.allowed && verdict.reason === "free";
}

export type NameValidation =
  | { valid: true; name: string }
  | { valid: false; error: string };

/**
 * Validates and normalises a name the player typed.
 *
 * Returns the trimmed name on success so callers store the normalised form
 * rather than whatever whitespace came in.
 */
export function validatePetName(input: string): NameValidation {
  const name = input.trim();

  if (!name) {
    return { valid: false, error: "Your companion needs a name." };
  }
  if (name.length > MAX_PET_NAME_LENGTH) {
    return {
      valid: false,
      error: `Names can be at most ${MAX_PET_NAME_LENGTH} characters.`,
    };
  }
  return { valid: true, name };
}

/**
 * Whether saving this name should consume the free rename.
 *
 * Re-saving the same name is not a rename. Without this, opening the editor and
 * tapping the check without typing anything would burn the one free change.
 */
export function isActualRename(currentName: string | null, nextName: string): boolean {
  return (currentName ?? "").trim() !== nextName.trim();
}

/** The name to show: whatever the pet is called, falling back to its default. */
export function resolvePetDisplayName(
  petName: string | null | undefined,
  defaultPetName: string,
): string {
  const name = petName?.trim();
  return name ? name : defaultPetName;
}
