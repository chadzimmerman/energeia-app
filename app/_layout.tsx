import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/utils/supabase';
import { checkMinVersion } from '@/utils/versionCheck';
import ForceUpdateModal from '@/components/ForceUpdateModal';
import { SeasonProvider } from '@/contexts/SeasonContext';

export {
  ErrorBoundary,
} from 'expo-router';

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
    <SeasonProvider>
      <RootLayoutNav initialSession={session} />
      <ForceUpdateModal visible={versionOk === false} />
    </SeasonProvider>
  );
}

function RootLayoutNav({ initialSession }: { initialSession: Session | null }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Start from the known initial session; onAuthStateChange handles updates.
  const [session, setSession] = useState<Session | null>(initialSession);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

      // PKCE flow: code exchange
      const code = params.code as string | undefined;
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      // OTP / magic-link flow: token_hash + type
      const token_hash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;
      if (token_hash && type) {
        await supabase.auth.verifyOtp({ token_hash, type: type as any });
        return;
      }

      // Legacy hash fragment flow: #access_token=...&refresh_token=...
      const hash = url.split('#')[1];
      if (hash) {
        const hp = new URLSearchParams(hash);
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
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

    if (!session && !inLoginScreen) {
      router.replace('/login');
    } else if (session && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, segments, navigationState?.key, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
