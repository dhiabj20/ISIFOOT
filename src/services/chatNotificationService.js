import { supabase } from './supabase';
import { getUserChatFixtures } from './fixtureService';

function previewMessage(message) {
  if (!message) {
    return '';
  }
  const trimmed = String(message).trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77)}...`;
}

export function startChatMessageNotifications({ userId, onNotify }) {
  if (!userId || typeof onNotify !== 'function') {
    return () => {};
  }

  let stopped = false;
  const channels = new Map();
  const fixtureMeta = new Map();
  const seenMessageIds = new Set();
  let syncTimer = null;

  const removeChannel = (fixtureId) => {
    const channel = channels.get(fixtureId);
    if (!channel) {
      return;
    }
    supabase.removeChannel(channel);
    channels.delete(fixtureId);
    fixtureMeta.delete(fixtureId);
  };

  const subscribeFixture = (fixture) => {
    if (!fixture?.id || channels.has(fixture.id)) {
      return;
    }

    fixtureMeta.set(fixture.id, {
      title: `${fixture.team_a_name || 'Equipe A'} vs ${fixture.team_b_name || 'Equipe B'}`,
    });

    const channel = supabase
      .channel(`chat-notify-${fixture.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fixture_messages',
          filter: `fixture_id=eq.${fixture.id}`,
        },
        async (payload) => {
          if (stopped) {
            return;
          }

          const message = payload?.new;
          if (!message?.id || message.user_id === userId || seenMessageIds.has(message.id)) {
            return;
          }
          seenMessageIds.add(message.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', message.user_id)
            .single();

          const sender = profile?.username || profile?.full_name || 'Joueur';
          const meta = fixtureMeta.get(fixture.id);
          const title = `Nouveau message - ${meta?.title || 'Match'}`;
          const body = `${sender}: ${previewMessage(message.message)}`;

          onNotify({
            title,
            body,
            fixtureId: fixture.id,
            senderId: message.user_id,
            messageId: message.id,
          });
        }
      )
      .subscribe();

    channels.set(fixture.id, channel);
  };

  const syncFixtures = async () => {
    if (stopped) {
      return;
    }

    const { data: fixtures } = await getUserChatFixtures(userId);
    const nextIds = new Set((fixtures || []).map((fixture) => fixture.id));

    (fixtures || []).forEach((fixture) => subscribeFixture(fixture));

    Array.from(channels.keys()).forEach((fixtureId) => {
      if (!nextIds.has(fixtureId)) {
        removeChannel(fixtureId);
      }
    });
  };

  syncFixtures();
  syncTimer = setInterval(syncFixtures, 60000);

  return () => {
    stopped = true;
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    Array.from(channels.keys()).forEach((fixtureId) => removeChannel(fixtureId));
  };
}
