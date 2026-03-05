import { supabase } from "@/utils/supabase";
import { resolveCharacterImage } from "@/utils/resolveCharacterImage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Gender = "male" | "female";
type PlayerClass = "Monk" | "Fighter" | "Noble";

const CLASS_OPTIONS: { id: PlayerClass; label: string; tagline: string }[] = [
  { id: "Monk", label: "Monk", tagline: "Prayer & fasting" },
  { id: "Fighter", label: "Fighter", tagline: "Shield & sword" },
  { id: "Noble", label: "Noble", tagline: "Wisdom & stewardship" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender>("male");
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const characterImageKey = selectedClass
    ? `${selectedClass.toLowerCase()}_${gender}`
    : `monk_${gender}`;

  const canBegin = !!selectedClass && username.trim().length > 0;

  const handleBegin = async () => {
    if (!canBegin) return;
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const trimmedUsername = username.trim();
      // Handle = lowercase, spaces replaced with underscores
      const handle = trimmedUsername.toLowerCase().replace(/\s+/g, "_");

      const { error } = await supabase
        .from("profiles")
        .update({
          username: trimmedUsername,
          handle,
          player_class: selectedClass,
          character_image_path: `${selectedClass!.toLowerCase()}_${gender}`,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      router.replace("/(tabs)");
    } catch (e: any) {
      console.error("Onboarding save error:", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Energe.ia</Text>
        <Text style={styles.subtitle}>Choose Your Path</Text>
      </View>

      {/* Character Preview */}
      <View style={styles.previewContainer}>
        <Image
          source={resolveCharacterImage(characterImageKey)}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </View>

      {/* Username Input */}
      <Text style={styles.sectionLabel}>Your Name</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Enter your name..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={username}
          onChangeText={setUsername}
          maxLength={30}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Gender Toggle */}
      <Text style={styles.sectionLabel}>Your Character</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === "male" && styles.genderButtonActive,
          ]}
          onPress={() => setGender("male")}
        >
          <Text
            style={[
              styles.genderButtonText,
              gender === "male" && styles.genderButtonTextActive,
            ]}
          >
            Boy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            gender === "female" && styles.genderButtonActive,
          ]}
          onPress={() => setGender("female")}
        >
          <Text
            style={[
              styles.genderButtonText,
              gender === "female" && styles.genderButtonTextActive,
            ]}
          >
            Girl
          </Text>
        </TouchableOpacity>
      </View>

      {/* Class Selection */}
      <Text style={styles.sectionLabel}>Choose Your Class</Text>
      <View style={styles.classRow}>
        {CLASS_OPTIONS.map((cls) => (
          <TouchableOpacity
            key={cls.id}
            style={[
              styles.classCard,
              selectedClass === cls.id && styles.classCardActive,
            ]}
            onPress={() => setSelectedClass(cls.id)}
          >
            <Text
              style={[
                styles.classLabel,
                selectedClass === cls.id && styles.classLabelActive,
              ]}
            >
              {cls.label}
            </Text>
            <Text
              style={[
                styles.classTagline,
                selectedClass === cls.id && styles.classTaglineActive,
              ]}
            >
              {cls.tagline}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Begin Button */}
      <TouchableOpacity
        style={[
          styles.beginButton,
          !canBegin && styles.beginButtonDisabled,
        ]}
        onPress={handleBegin}
        disabled={!canBegin || saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.beginButtonText}>Begin Your Journey</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PURPLE = "#A737FD";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a0a2e",
  },
  content: {
    paddingBottom: 50,
    alignItems: "center",
  },
  header: {
    paddingTop: 70,
    paddingBottom: 20,
    alignItems: "center",
  },
  appName: {
    fontSize: 38,
    fontWeight: "bold",
    color: PURPLE,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  previewContainer: {
    width: 180,
    height: 180,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 90,
    borderWidth: 2,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  characterImage: {
    width: 150,
    height: 150,
  },
  inputWrapper: {
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  genderButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  genderButtonActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  genderButtonText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "600",
  },
  genderButtonTextActive: {
    color: "#fff",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 24,
  },
  classRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 36,
  },
  classCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  classCardActive: {
    borderColor: PURPLE,
    backgroundColor: "rgba(167,55,253,0.2)",
  },
  classLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  classLabelActive: {
    color: "#fff",
  },
  classTagline: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },
  classTaglineActive: {
    color: "rgba(255,255,255,0.75)",
  },
  beginButton: {
    backgroundColor: PURPLE,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    alignItems: "center",
  },
  beginButtonDisabled: {
    backgroundColor: "rgba(167,55,253,0.3)",
  },
  beginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
