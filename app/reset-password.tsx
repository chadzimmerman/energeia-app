import { supabase } from "@/utils/supabase";
import { checkNewPassword } from "@/utils/passwordPolicy";
import { getSeasonalColor, getSeasonalDarkColor } from "@/utils/seasons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Where a password reset link lands.
 *
 * Following a recovery link signs the user in — that is how Supabase recovery
 * works — but a session is not the goal, a new password is. Without this screen
 * the link dropped the user on the habits tab still not knowing their password,
 * and the only password UI in the app asks for the current one first, which is
 * exactly what they do not have.
 *
 * updateUser() works here because the recovery session is already active.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  // Called at render rather than module scope so the accent tracks the season.
  const seasonColor = getSeasonalColor();
  const seasonDarkColor = getSeasonalDarkColor();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    const check = checkNewPassword(password, confirm);
    if (!check.valid) {
      setError(check.error);
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Could not update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={[styles.title, { color: seasonColor }]}>Choose a New Password</Text>
        <Text style={styles.subtitle}>
          You&apos;re signed in from your reset link. Set a new password to finish.
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: seasonDarkColor }]}
          placeholder="New password"
          placeholderTextColor="rgba(255,255,255,0.6)"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[styles.input, { backgroundColor: seasonDarkColor }]}
          placeholder="Confirm new password"
          placeholderTextColor="rgba(255,255,255,0.6)"
          secureTextEntry
          autoCapitalize="none"
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: seasonColor }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Save Password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#bbb",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 26,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 14,
  },
  error: {
    color: "#E74C3C",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
