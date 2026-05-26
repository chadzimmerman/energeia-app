import { supabase } from "@/utils/supabase";
import { getSeasonalColor, getSeasonalDarkColor } from "@/utils/seasons";
import { useRouter } from "expo-router";
import React, { useState } from "react";

const seasonColor = getSeasonalColor();
const seasonDarkColor = getSeasonalDarkColor();
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

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (mode === "forgot") {
      if (!email) { setError("Please enter your email address."); return; }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://pnhfekszpoaeelbbvtyw.supabase.co",
        });
        if (error) throw error;
        setResetSent(true);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Profile row is created automatically by the on_auth_user_created
        // DB trigger (SECURITY DEFINER), so no client-side insert is needed here.
        // With email confirmation ON, there is no session yet at this point anyway.
        router.replace("/onboarding");
        return;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "login" | "signup" | "forgot") => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* App Title */}
      <View style={styles.headerSection}>
        <Text style={styles.appName}>Energe.ia</Text>
        <Text style={styles.subtitle}>Your Journey Awaits</Text>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Reset Password"}
        </Text>

        {/* Forgot password success state */}
        {mode === "forgot" && resetSent ? (
          <>
            <Text style={styles.resetSentText}>
              Check your email for a reset link. Once you've reset your password, come back and log in.
            </Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => switchMode("login")}>
              <Text style={styles.submitButtonText}>Back to Log In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            {mode !== "forgot" && (
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
                </Text>
              )}
            </TouchableOpacity>

            {mode === "login" && (
              <TouchableOpacity style={styles.toggleButton} onPress={() => switchMode("forgot")}>
                <Text style={styles.toggleText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => switchMode(mode === "signup" ? "login" : "signup")}
            >
              <Text style={styles.toggleText}>
                {mode === "login" || mode === "forgot"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Log in"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: seasonColor,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 6,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: seasonDarkColor,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
    marginBottom: 14,
  },
  errorText: {
    color: "#C81E32",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: seasonColor,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  toggleButton: {
    marginTop: 20,
    alignItems: "center",
  },
  toggleText: {
    color: seasonColor,
    fontSize: 14,
  },
  resetSentText: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
});
