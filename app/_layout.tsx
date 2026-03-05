import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/utils/supabase';

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

  // Run the session check in parallel with font loading so the splash
  // hides only when BOTH are done — no blank screen in between.
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Hide the splash only once fonts AND the initial session check are ready.
  useEffect(() => {
    if (loaded && session !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [loaded, session]);

  if (!loaded || session === undefined) {
    return null; // Splash stays visible while either check is still pending
  }

  return <RootLayoutNav initialSession={session} />;
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

  useEffect(() => {
    // Wait until the navigator is ready
    if (!navigationState?.key) return;

    const inLoginScreen = segments[0] === 'login';

    if (!session && !inLoginScreen) {
      router.replace('/login');
    } else if (session && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, segments, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
