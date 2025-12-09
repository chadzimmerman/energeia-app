import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js'; // Removed processLock for simplicity
import 'react-native-url-polyfill/auto';

// IMPORTANT: process.env.EXPO_PUBLIC_... variables are only available after running the install commands above
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// Create and export the Supabase client instance
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Use AsyncStorage for storing the user session token
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // NOTE: We don't need 'lock: processLock' here for a standard Expo project
    },
  }
);