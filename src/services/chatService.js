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

export function subscribeToFixtureMessages(fixtureId, currentUserId, onMessage) {
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
        const raw = payload.new;
        const senderId = raw.user_id;

        if (senderId === currentUserId) {
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', senderId)
          .single();

        onMessage({
          id: raw.id,
          message: raw.message,
          created_at: raw.created_at,
          user_id: senderId,
          profiles: profile,
        });
      }
    )
    .subscribe(async (status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Real-time channel error, reconnecting...');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
