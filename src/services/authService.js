import { SUPABASE_EMAIL_REDIRECT_TO } from '@env';
import { supabase } from './supabase';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function signupOptions(fullName, username) {
  const options = {
    data: {
      full_name: (fullName || '').trim(),
      username: (username || '').trim(),
    },
  };

  if (SUPABASE_EMAIL_REDIRECT_TO) {
    options.emailRedirectTo = SUPABASE_EMAIL_REDIRECT_TO;
  }

  return options;
}

function isObfuscatedExistingUser(user) {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}

export async function signUp({ email, password, fullName, username }) {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: signupOptions(fullName, username),
  });

  if (error) {
    return { error };
  }

  return {
    data,
    requiresEmailConfirmation: true,
    maybeExistingUser: isObfuscatedExistingUser(data?.user),
  };
}

export async function resendSignupConfirmation(email) {
  const normalizedEmail = normalizeEmail(email);

  const payload = {
    type: 'signup',
    email: normalizedEmail,
  };

  if (SUPABASE_EMAIL_REDIRECT_TO) {
    payload.options = { emailRedirectTo: SUPABASE_EMAIL_REDIRECT_TO };
  }

  const { data, error } = await supabase.auth.resend(payload);
  return { data, error };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) {
    return { error };
  }

  return { data };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
}
