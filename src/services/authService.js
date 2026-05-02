// src/services/authService.js
import { supabase } from './supabase';

// ── Sign Up ──────────────────────────────────────────────────
export async function signUp({ email, password, fullName, username, studentId }) {
  // 1. Check username uniqueness first
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim())
    .single();

  if (existing) {
    return { error: { message: 'Ce nom d\'utilisateur est déjà pris.' } };
  }

  // 2. Create auth user (trigger auto-creates profile)
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        username: username.trim(),
        student_id: studentId?.trim() || null,
      },
    },
  });

  if (error) {return { error };}
  return { data };
}

// ── Sign In ──────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {return { error };}
  return { data };
}

// ── Sign Out ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ── Get current session ───────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── Get current user profile ──────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}
