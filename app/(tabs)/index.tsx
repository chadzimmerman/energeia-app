import { StyleSheet } from "react-native";

import CharacterStats from "@/components/CharacterStats";
import EditScreenInfo from "@/components/EditScreenInfo";
import { View } from "@/components/Themed";

export default function HabitScreen() {
  return (
    <View style={styles.container}>
      <CharacterStats
        backgroundImageSource={require("../../assets/sprites/ui-elements/winter-background.png")}
        characterImageSource={require("../../assets/sprites/characters/monk/novice-monk-male.png")}
        currentHealth={75}
        maxHealth={100}
        currentEnergy={50}
        maxEnergy={100}
      />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    //justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
