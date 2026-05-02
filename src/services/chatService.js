// src/services/chatService.js
import { supabase } from './supabase';

export async function getFixtureMessages(fixtureId) {
  const { data, error } = await supabase
    .from('fixture_messages')
    .select('id, message, created_at, user_id, profiles(username, full_name)')
    .eq('fixture_id', fixtureId)
    .order('created_at', { ascending: true });

  return { data, error };
}

export async function sendFixtureMessage({ fixtureId, userId, message }) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return { error: { message: 'Le message ne peut pas etre vide.' } };
  }

  const { data, error } = await supabase
    .from('fixture_messages')
    .insert({
      fixture_id: fixtureId,
      user_id: userId,
      message: trimmed,
    })
    .select('id, message, created_at, user_id, profiles(username, full_name)')
    .single();

  return { data, error };
}

export function subscribeToFixtureMessages(fixtureId, onMessage) {
  const channel = supabase
    .channel(`fixture-messages-${fixtureId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'fixture_messages',
        filter: `fixture_id=eq.${fixtureId}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from('fixture_messages')
          .select('id, message, created_at, user_id, profiles(username, full_name)')
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onMessage(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
