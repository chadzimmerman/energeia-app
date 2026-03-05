import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function UsernameScreen() {
  const router = useRouter();
  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setCurrentUsername(data.username);
        setNewUsername(data.username);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Username cannot be empty.");
      return;
    }
    if (trimmed === currentUsername) {
      router.back();
      return;
    }
    if (trimmed.length < 3) {
      Alert.alert("Too Short", "Username must be at least 3 characters.");
      return;
    }

    setSaving(true);
    try {
      // Check uniqueness — does any OTHER user already have this name?
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", trimmed)
        .neq("id", userId!)
        .maybeSingle();

      if (existing) {
        Alert.alert("Name Taken", "That username is already in use. Please choose another.");
        return;
      }

      const handle = trimmed.toLowerCase().replace(/\s+/g, "_");
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed, handle })
        .eq("id", userId!);

      if (error) throw error;

      Alert.alert("Updated", "Your username has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NEW USERNAME</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={newUsername}
            onChangeText={setNewUsername}
            placeholder="Enter new username"
            placeholderTextColor="#aaa"
            maxLength={30}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
          />
        </View>
        <Text style={styles.hint}>
          Your handle will be @{newUsername.trim().toLowerCase().replace(/\s+/g, "_") || "…"}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Username</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const PURPLE = "#A737FD";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
  },
  hint: {
    fontSize: 13,
    color: "#888",
    marginTop: 8,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
