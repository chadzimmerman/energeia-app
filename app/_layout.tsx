import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/utils/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';
import { checkMinVersion } from '@/utils/versionCheck';
import ForceUpdateModal from '@/components/ForceUpdateModal';

export {
  ErrorBoundary,
} from 'expo-router';

// Types Supabase can send on an email link. Anything else is ignored.
const OTP_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before we're ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Run the session + version checks in parallel with font loading so the
  // splash hides only when ALL three are done — no blank screen in between.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [versionOk, setVersionOk] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    checkMinVersion().then(setVersionOk);
  }, []);

  // Hide the splash only once fonts, session, and version check are all ready.
  useEffect(() => {
    if (loaded && session !== undefined && versionOk !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [loaded, session, versionOk]);

  if (!loaded || session === undefined || versionOk === undefined) {
    return null; // Splash stays visible while any check is still pending
  }

  return (
    <>
      <RootLayoutNav initialSession={session} />
      <ForceUpdateModal visible={versionOk === false} />
    </>
  );
}

function RootLayoutNav({ initialSession }: { initialSession: Session | null }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Start from the known initial session; onAuthStateChange handles updates.
  const [session, setSession] = useState<Session | null>(initialSession);
  // True between following a recovery link and saving the new password.
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // A recovery link signs the user in, but a session is not what they came
      // for. Send them somewhere they can actually set a new password — the
      // only other password UI asks for the current one, which is the thing
      // they have forgotten.
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links for email confirmation and password reset.
  // Supabase sends links in the form energeiaapp://auth/callback?token_hash=...&type=...
  // Handling it here lets onAuthStateChange pick up the session automatically.
  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      if (!url.includes('auth/callback')) return;

      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};

      // Anything that reaches here failed if we say nothing, and the user is
      // left staring at the login screen with no idea why. An expired link and
      // a link opened on a different device from the one that requested it both
      // land here and both need saying out loud.
      const reportFailure = (message: string) => {
        Alert.alert('Link Did Not Work', message);
      };

      // PKCE flow: code exchange
      const code = params.code as string | undefined;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          reportFailure(
            'This link could not be opened. It may have expired, or it may have been ' +
            'requested on a different device. Please request a new one.',
          );
        } else if (params.type === 'recovery') {
          setIsRecovering(true);
        }
        return;
      }

      // OTP / magic-link flow: token_hash + type. The type is checked against
      // the known set rather than cast, so a crafted link cannot push an
      // arbitrary string into verifyOtp.
      const token_hash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;
      if (token_hash && type && (OTP_TYPES as readonly string[]).includes(type)) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
        if (error) {
          reportFailure(
            'This link could not be opened. It may have expired or already been used. ' +
            'Please request a new one.',
          );
        } else if (type === 'recovery') {
          setIsRecovering(true);
        }
        return;
      }

      // Deliberately no implicit-flow branch here. Reading access_token and
      // refresh_token out of the URL fragment and calling setSession() would
      // accept tokens from whoever wrote the link: any page can open
      // energeiaapp://auth/callback#access_token=... and silently sign the user
      // into an account the attacker controls, after which everything they log
      // is written into that account. The client pins flowType: 'pkce', so real
      // links arrive as ?code= and are handled above.
    };

    // Cold-start: app was opened directly from the link
    Linking.getInitialURL().then((url) => { if (url) handleAuthUrl(url); });

    // Warm-start: app was already open and received the link
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Wait until the navigator is ready
    if (!navigationState?.key) return;

    const inLoginScreen = segments[0] === 'login';
    const inResetScreen = segments[0] === 'reset-password';

    if (!session && !inLoginScreen) {
      router.replace('/login');
    } else if (session && isRecovering && !inResetScreen) {
      // Hold them here until the password is actually changed, otherwise the
      // reset silently turns into a plain sign-in and nothing gets fixed.
      router.replace('/reset-password');
    } else if (session && inLoginScreen && !isRecovering) {
      router.replace('/(tabs)');
    }
  }, [session, isRecovering, segments, navigationState?.key, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
