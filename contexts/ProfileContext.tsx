import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { supabase } from "@/utils/supabase";
import { resolveItemImage, resolveCharacterSetImage } from "@/utils/resolveItemImage";

export interface Profile {
  id: string;
  username: string;
  current_health: number;
  max_health: number;
  current_energeia: number;
  max_energeia: number;
  energeia_currency: number;
  level: number;
  character_image_path: string;
  player_class: string;
  group_id: string | null;
}

interface ProfileContextValue {
  profile: Profile | null;
  equippedCharacterSet: ImageSourcePropType | null;
  equippedOverlays: ImageSourcePropType[];
  animalCompanion: ImageSourcePropType | null;
  wallItems: ImageSourcePropType[];
  floorItems: ImageSourcePropType[];
  handItems: ImageSourcePropType[];
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  equippedCharacterSet: null,
  equippedOverlays: [],
  animalCompanion: null,
  wallItems: [],
  floorItems: [],
  handItems: [],
  refreshProfile: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [equippedCharacterSet, setEquippedCharacterSet] = useState<ImageSourcePropType | null>(null);
  const [equippedOverlays, setEquippedOverlays] = useState<ImageSourcePropType[]>([]);
  const [animalCompanion, setAnimalCompanion] = useState<ImageSourcePropType | null>(null);
  const [wallItems, setWallItems] = useState<ImageSourcePropType[]>([]);
  const [floorItems, setFloorItems] = useState<ImageSourcePropType[]>([]);
  const [handItems, setHandItems] = useState<ImageSourcePropType[]>([]);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    let { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profileData) {
      // No profile row — user signed up before the fix. Create a default row
      // so onboarding can run and set their class/username.
      await supabase.from("profiles").upsert({
        id: userId,
        current_health: 100,
        max_health: 100,
        current_energeia: 0,
        energeia_currency: 0,
        level: 1,
      });
      const { data: created } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      profileData = created;
    }

    if (profileData) setProfile(profileData as Profile);

    // Unequip any items that no longer match the profile's class or gender.
    // Runs on every refresh so a class/gender change is always reflected immediately.
    const pathParts = (profileData?.character_image_path ?? "").split("_");
    const playerGender = pathParts[pathParts.length - 1] === "female" ? "female" : "male";
    const playerClass = profileData?.player_class?.toLowerCase() ?? null;

    const { data: equippedCheck } = await supabase
      .from("user_inventory")
      .select("id, item:item_master_id(required_class, gender)")
      .eq("user_id", userId)
      .eq("is_equipped", true);

    const mismatchIds = ((equippedCheck ?? []) as any[])
      .filter((r) => {
        const classMismatch = r.item?.required_class && playerClass && r.item.required_class !== playerClass;
        const genderMismatch = r.item?.gender && r.item.gender !== playerGender;
        return classMismatch || genderMismatch;
      })
      .map((r) => r.id);

    if (mismatchIds.length > 0) {
      await supabase.from("user_inventory").update({ is_equipped: false }).in("id", mismatchIds);
    }

    const { data: equipped } = await supabase
      .from("user_inventory")
      .select("item:item_master_id(image_path, type, display_slot)")
      .eq("user_id", userId)
      .eq("is_equipped", true);

    if (equipped) {
      // Render order: body behind everything, head on top
      const SLOT_ORDER: Record<string, number> = {
        character_body: 0,
        character_neck: 1,
        character_hand: 2,
        character_shield: 3,
        character_head: 4,
      };

      // character_set replaces the base sprite entirely — handle it separately
      const charSetItem = equipped.find((e: any) => e.item?.display_slot === "character_set");
      setEquippedCharacterSet(
        charSetItem ? resolveCharacterSetImage((charSetItem as any).item.image_path) : null
      );

      const characterItems = equipped
        .filter((e: any) => {
          const slot = e.item?.display_slot;
          if (slot) return slot.startsWith("character_") && slot !== "character_set";
          // Fallback: unslotted equippables still render on the sprite
          return e.item?.type === "equippable";
        })
        .sort((a: any, b: any) => {
          const aOrder = SLOT_ORDER[a.item?.display_slot] ?? 0;
          const bOrder = SLOT_ORDER[b.item?.display_slot] ?? 0;
          return aOrder - bOrder;
        });

      setEquippedOverlays(characterItems.map((e: any) => resolveItemImage(e.item.image_path)));

      const animal = equipped.find((e: any) => e.item?.display_slot === "animal");
      setAnimalCompanion(animal ? resolveItemImage((animal as any).item.image_path) : null);

      setWallItems(
        equipped
          .filter((e: any) => e.item?.display_slot === "wall")
          .map((e: any) => resolveItemImage(e.item.image_path))
      );

      setFloorItems(
        equipped
          .filter((e: any) => e.item?.display_slot === "floor")
          .map((e: any) => resolveItemImage(e.item.image_path))
      );

      setHandItems(
        equipped
          .filter((e: any) => e.item?.display_slot === "hand")
          .map((e: any) => resolveItemImage(e.item.image_path))
      );
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, equippedCharacterSet, equippedOverlays, animalCompanion, wallItems, floorItems, handItems, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
