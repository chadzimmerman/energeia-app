import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { supabase } from "@/utils/supabase";
import { resolveItemImage, resolveCharacterSetImage } from "@/utils/resolveItemImage";
import { BACKGROUND_COLORS, DEFAULT_BG } from "@/utils/backgroundColors";

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
  animalInventoryId: string | null;
  petName: string | null;
  petTappedToday: boolean;
  wallItems: ImageSourcePropType[];
  floorItems: ImageSourcePropType[];
  handItems: ImageSourcePropType[];
  characterBgColors: { wall: string; floor: string };
  refreshProfile: () => Promise<void>;
  handlePetTap: () => Promise<void>;
}


const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  equippedCharacterSet: null,
  equippedOverlays: [],
  animalCompanion: null,
  animalInventoryId: null,
  petName: null,
  petTappedToday: false,
  wallItems: [],
  floorItems: [],
  handItems: [],
  characterBgColors: DEFAULT_BG,
  refreshProfile: async () => {},
  handlePetTap: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [equippedCharacterSet, setEquippedCharacterSet] = useState<ImageSourcePropType | null>(null);
  const [equippedOverlays, setEquippedOverlays] = useState<ImageSourcePropType[]>([]);
  const [animalCompanion, setAnimalCompanion] = useState<ImageSourcePropType | null>(null);
  const [animalInventoryId, setAnimalInventoryId] = useState<string | null>(null);
  const [petName, setPetName] = useState<string | null>(null);
  const [petTappedToday, setPetTappedToday] = useState(false);
  const [wallItems, setWallItems] = useState<ImageSourcePropType[]>([]);
  const [floorItems, setFloorItems] = useState<ImageSourcePropType[]>([]);
  const [handItems, setHandItems] = useState<ImageSourcePropType[]>([]);
  const [characterBgColors, setCharacterBgColors] = useState(DEFAULT_BG);

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
      .select("id, pet_name, last_pet_tap_date, item:item_master_id(image_path, type, display_slot, default_pet_name)")
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
          if (slot) return slot.startsWith("character_") && slot !== "character_set" && slot !== "character_background";
          // Fallback: unslotted equippables still render on the sprite
          return e.item?.type === "equippable";
        })
        .sort((a: any, b: any) => {
          const aOrder = SLOT_ORDER[a.item?.display_slot] ?? 0;
          const bOrder = SLOT_ORDER[b.item?.display_slot] ?? 0;
          return aOrder - bOrder;
        });

      setEquippedOverlays(characterItems.map((e: any) => resolveItemImage(e.item.image_path)));

      const animal = equipped.find((e: any) => e.item?.display_slot === "animal") as any ?? null;
      setAnimalCompanion(animal ? resolveItemImage(animal.item.image_path) : null);
      setAnimalInventoryId(animal ? animal.id : null);
      setPetName(animal ? (animal.pet_name ?? animal.item?.default_pet_name ?? null) : null);
      const today = new Date().toISOString().split("T")[0];
      setPetTappedToday(animal ? animal.last_pet_tap_date === today : false);

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

      const bgItem = equipped.find((e: any) => e.item?.display_slot === "character_background") as any ?? null;
      setCharacterBgColors(bgItem ? (BACKGROUND_COLORS[bgItem.item.image_path] ?? DEFAULT_BG) : DEFAULT_BG);
    }
  }, []);

  const handlePetTap = useCallback(async () => {
    if (petTappedToday || !animalInventoryId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: inv } = await supabase.from("user_inventory").select("happiness").eq("id", animalInventoryId).single();
    const newHappiness = Math.min(10, (inv?.happiness ?? 5) + 1);
    await supabase.from("user_inventory").update({
      last_pet_tap_date: today,
      happiness: newHappiness,
      happiness_decay_date: today,
    }).eq("id", animalInventoryId);
    await supabase.from("profiles").update({ energeia_currency: (profile?.energeia_currency ?? 0) + 1 }).eq("id", userId);
    await refreshProfile();
  }, [petTappedToday, animalInventoryId, profile?.energeia_currency, refreshProfile]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, equippedCharacterSet, equippedOverlays, animalCompanion, animalInventoryId, petName, petTappedToday, wallItems, floorItems, handItems, characterBgColors, refreshProfile, handlePetTap }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
