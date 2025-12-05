// app/(tabs)/settings/_layout.tsx - THE DEFINITIVE FIX

import { Stack } from "expo-router";

export default function SettingsStackLayout() {
  return (
    <Stack>
      {/* 1. Define the Index Screen */}
      <Stack.Screen
        name="index" // Points to settings/index.tsx
        options={{
          title: "Settings", // ✅ FORCES THE TITLE TO "Settings"
          //headerShown: false, // Hides the header so your custom header is used
        }}
      />

      {/* 2. Define the About Screen */}
      <Stack.Screen
        name="about" // Points to settings/about.tsx
        options={{
          title: "About", // Sets the title of the About page header
          // The back button text now correctly inherits the title of the 'index' screen ("Settings")
        }}
      />
    </Stack>
  );
}
