import { useState, useCallback } from 'react';
import { getFixtures, joinFixture, leaveFixture, createFixture, getUserChatFixtures } from '../services/fixtureService';

export function useFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFixtures = useCallback(async () => {
    setLoading(true);
    const { data } = await getFixtures();
    setFixtures(data || []);
    setLoading(false);
  }, []);

  const join = useCallback(async ({ fixtureId, userId, team }) => {
    const { data, error } = await joinFixture({ fixtureId, userId, team });
    if (!error) {
      setFixtures((prev) => prev.map((f) => f.id === fixtureId ? {
        ...f,
        fixture_players: [...(f.fixture_players || []), data],
      } : f));
    }
    return { data, error };
  }, []);

  const leave = useCallback(async ({ fixtureId, userId }) => {
    const { error } = await leaveFixture({ fixtureId, userId });
    if (!error) {
      setFixtures((prev) => prev.map((f) => f.id === fixtureId ? {
        ...f,
        fixture_players: (f.fixture_players || []).filter((p) => p.user_id !== userId),
      } : f));
    }
    return { error };
  }, []);

  return {
    fixtures,
    loading,
    loadFixtures,
    joinFixture: join,
    leaveFixture: leave,
  };
}

export async function fetchUserChatFixtures(userId) {
  const { data } = await getUserChatFixtures(userId);
  return data || [];
}

export async function createNewFixture(params) {
  const { data, error } = await createFixture(params);
  return { data, error };
}
