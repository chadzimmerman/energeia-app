import * as Application from "expo-application";
import { supabase } from "./supabase";

/**
 * Compares dotted versions numerically, so 1.10.0 beats 1.9.0. A string compare
 * gets that backwards, which is the classic way a version gate locks out the
 * newest build instead of the oldest.
 *
 * Exported for tests only.
 */
export const isVersionAtLeast = (current: string, minimum: string): boolean => {
  const parse = (v: string) => v.split(".").map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [mMaj, mMin, mPat] = parse(minimum);
  if (cMaj !== mMaj) return cMaj > mMaj;
  if (cMin !== mMin) return cMin > mMin;
  return cPat >= mPat;
};

// Returns true if the running version meets the minimum, false if an update is required.
// On any error (no config row, network failure) returns true so the gate never false-blocks.
export const checkMinVersion = async (): Promise<boolean> => {
  try {
    const current = Application.nativeApplicationVersion ?? "0.0.0";
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "min_ios_version")
      .maybeSingle();

    if (!data) return true;
    return isVersionAtLeast(current, data.value);
  } catch {
    return true;
  }
};
