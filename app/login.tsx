import { supabase } from "@/utils/supabase";
import { checkNewPassword } from "@/utils/passwordPolicy";
import { useSeason } from "@/contexts/SeasonContext";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const { seasonColor, seasonDarkColor, loginBackground } = useSeason();
  const styles = useMemo(
    () => makeStyles(seasonColor, seasonDarkColor),
    [seasonColor, seasonDarkColor],
  );

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (mode === "forgot") {
      if (!email) { setError("Please enter your email address."); return; }
      setLoading(true);
      try {
        // Must be the app's deep-link scheme, not the Supabase host. Pointing at
        // the project URL drops the user on a Supabase page instead of returning
        // them to the app, so _layout's auth/callback handler never runs and the
        // reset cannot complete.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "energeiaapp://auth/callback",
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

    // Signup only. Signing in must not apply the current floor to a password
    // chosen under an older one, or an existing user is locked out of their own
    // account by a rule that did not exist when they made it.
    if (mode === "signup") {
      const check = checkNewPassword(password);
      if (!check.valid) {
        setError(check.error);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: "energeiaapp://auth/callback" },
        });
        if (error) throw error;

        // No session yet — email confirmation is required.
        // Profile row is created by the DB trigger once they confirm.
        // The tabs index will route to onboarding once they have a session.
        setSignupSent(true);
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
    <ImageBackground source={loginBackground} style={styles.background} resizeMode="cover">
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.appName}>Energe.ia</Text>
        <Text style={styles.subtitle}>Your Journey Awaits</Text>
        <View style={styles.cardDivider} />
        <Text style={styles.cardTitle}>
          {mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Reset Password"}
        </Text>

        {/* Sign up success state — waiting for email confirmation */}
        {mode === "signup" && signupSent ? (
          <>
            <Text style={styles.resetSentText}>
              We sent a confirmation link to {email}. Open it to activate your account, then come back and log in.
            </Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => { setMode("login"); setSignupSent(false); }}>
              <Text style={styles.submitButtonText}>Back to Log In</Text>
            </TouchableOpacity>
          </>
        ) : mode === "forgot" && resetSent ? (
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
    </ImageBackground>
  );
}

const makeStyles = (seasonColor: string, seasonDarkColor: string) => StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 42,
    fontWeight: "bold",
    color: seasonColor,
    letterSpacing: 1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
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
