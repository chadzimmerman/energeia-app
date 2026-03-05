import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      Alert.alert("Missing Fields", "Please fill out all fields.");
      return;
    }
    if (next.length < 8) {
      Alert.alert("Too Short", "New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Mismatch", "New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      // Verify current password by re-authenticating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error("No session found.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: current,
      });
      if (signInError) {
        Alert.alert("Incorrect Password", "Your current password is wrong.");
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) throw updateError;

      Alert.alert("Updated", "Your password has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Current Password</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={current}
            onChangeText={setCurrent}
            placeholder="Enter current password"
            placeholderTextColor="#aaa"
            secureTextEntry
            autoFocus
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>New Password</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={[styles.input, styles.inputBorder]}
            value={next}
            onChangeText={setNext}
            placeholder="At least 8 characters"
            placeholderTextColor="#aaa"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm new password"
            placeholderTextColor="#aaa"
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Update Password</Text>
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
    marginBottom: 24,
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
  inputBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  saveButton: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
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
