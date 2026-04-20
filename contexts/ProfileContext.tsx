import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { supabase } from "@/utils/supabase";
import { resolveItemImage } from "@/utils/resolveItemImage";

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
  equippedOverlays: ImageSourcePropType[];
  animalCompanion: ImageSourcePropType | null;
  wallItems: ImageSourcePropType[];
  floorItems: ImageSourcePropType[];
  handItems: ImageSourcePropType[];
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  equippedOverlays: [],
  animalCompanion: null,
  wallItems: [],
  floorItems: [],
  handItems: [],
  refreshProfile: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
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

      const characterItems = equipped
        .filter((e: any) => {
          const slot = e.item?.display_slot;
          if (slot) return slot.startsWith("character_");
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
    <ProfileContext.Provider value={{ profile, equippedOverlays, animalCompanion, wallItems, floorItems, handItems, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
