// src/services/supabase.js
// ============================================================
// ISIFOOT — Supabase Client
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values
// from: https://supabase.com → Project Settings → API
// ============================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const resolvedSupabaseUrl = SUPABASE_URL || '';
const resolvedSupabaseAnonKey = SUPABASE_ANON_KEY || '';

if (
  !resolvedSupabaseUrl ||
  !resolvedSupabaseAnonKey ||
  resolvedSupabaseUrl.includes('YOUR_PROJECT_ID') ||
  resolvedSupabaseAnonKey.includes('YOUR_ANON_PUBLIC_KEY')
) {
  // Fail fast so local setup issues are obvious during development.
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.'
  );
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
