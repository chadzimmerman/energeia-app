import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/utils/supabase';
import { checkMinVersion } from '@/utils/versionCheck';
import ForceUpdateModal from '@/components/ForceUpdateModal';

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
