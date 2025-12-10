// data/achievements.ts

import { ImageSourcePropType } from "react-native";

// Define a key type for your static image assets
type ImageAsset = ImageSourcePropType;

// Use require for all local images
const ACHIEVEMENTS_IMAGES = {
  BLANK: require("../assets/sprites/achievements/blank-achievement.png"),
  All_ICONS: require("../assets/sprites/achievements/all-icons-achievement.png"),
  ALL_PETS: require("../assets/sprites/achievements/all-pets-achievement.png"),
  ALL_ITEMS: require("../assets/sprites/achievements/all-items-achievement.png"),
  FIRST_FRIEND: require("../assets/sprites/achievements/first-friend-achievement.png"),
  FIRST_ICON: require("../assets/sprites/achievements/first-icon-achievement.png"),
  // FIRST_JOURNEY: require("../assets/sprites/achievements/first-journey-achievement.png"),
  // FIRST_PET: require("../assets/sprites/achievements/first-pet-achievement.png"),
  // FIRST_TASK: require("../assets/sprites/achievements/first-task-achievement.png"),
  // FIRST_WEAPON: require("../assets/sprites/achievements/first-weapon-achievement.png"),
  // FULL_ARMOR: require("../assets/sprites/achievements/full-armor-achievement.png"),
  // LEVEL_10: require("../assets/sprites/achievements/level-10-achievement.png"),
  // LEVEL_20: require("../assets/sprites/achievements/level-20-achievement.png"),
  // LEVEL_30: require("../assets/sprites/achievements/level-30-achievement.png"),
  // SUBSCRIBER: require("../assets/sprites/achievements/subscriber-achievement.png"),
  // ... add all your achievement images here
};

// Define the structure for an achievement
export interface AchievementDefinition {
  id: string; // Unique programmatic ID
  title: string;
  description: string;
  imageKey: keyof typeof ACHIEVEMENTS_IMAGES; // Key to look up the image
  // You might add a 'progress_type' later (e.g., 'pets_collected', 'cards_sent')
}

// Full list of Achievements
export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "all_icons",
    title: "Collect All Icons",
    description: "You've been quite busy! You're icon corner is enough for a small Church!",
    imageKey: "All_ICONS",
  },
  {
    id: "all_pets",
    title: "Collect All Pets",
    description: "You're new friends must be very happy at your monastery!",
    imageKey: "ALL_PETS",
  },
  {
    id: "all_items",
    title: "Collect All Items",
    description: "You have been busy! Enough books and ink for a small library!",
    imageKey: "ALL_ITEMS",
  },
  {
    id: "first_friend",
    title: "Add Your First Friend",
    description: "You and your friend are well on your way.",
    imageKey: "FIRST_FRIEND",
  },
  {
    id: "first_icon",
    title: "Collect First Icon",
    description: "Hurray! You're first icon! Don't forget to equip it to really benefit from it's use.",
    imageKey: "FIRST_ICON",
  },
];

// Helper function to get the correct image based on completion status
export const getAchievementImageSource = (
  imageKey: keyof typeof ACHIEVEMENTS_IMAGES,
  isAchieved: boolean
): ImageAsset => {
  if (isAchieved) {
    return ACHIEVEMENTS_IMAGES[imageKey];
  }
  return ACHIEVEMENTS_IMAGES.BLANK;
};