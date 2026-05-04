import { supabase } from './supabase';

export async function getFixtures() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      reservations(status),
      fixture_players(id, user_id, team, profiles(full_name, username))
    `)
    .gte('date', today)
    .eq('visibility', 'public')
    .neq('status', 'cancelled')
    .order('date', { ascending: true });

  const filtered = (data || []).filter((fixture) => {
    if (!fixture.reservations) {
      return true;
    }

    const reservationStatus = Array.isArray(fixture.reservations)
      ? fixture.reservations[0]?.status
      : fixture.reservations?.status;

    return reservationStatus === 'confirmed';
  });

  return { data: filtered, error };
}

export async function joinFixture({ fixtureId, userId, team }) {
  const { data: existing } = await supabase
    .from('fixture_players')
    .select('id')
    .eq('fixture_id', fixtureId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { error: { message: 'Vous avez deja rejoint ce match.' } };
  }

  const { data, error } = await supabase
    .from('fixture_players')
    .insert({ fixture_id: fixtureId, user_id: userId, team })
    .select()
    .single();

  return { data, error };
}

export async function leaveFixture({ fixtureId, userId }) {
  const { error } = await supabase
    .from('fixture_players')
    .delete()
    .eq('fixture_id', fixtureId)
    .eq('user_id', userId);

  return { error };
}

export async function createFixture({
  reservationId,
  createdBy,
  date,
  startTime,
  endTime,
  teamAName,
  teamBName,
  teamAMax,
  teamBMax,
}) {
  const { data, error } = await supabase
    .from('fixtures')
    .insert({
      reservation_id: reservationId,
      date,
      start_time: startTime,
      end_time: endTime,
      visibility: 'public',
      team_a_name: teamAName || 'Equipe A',
      team_b_name: teamBName || 'Equipe B',
      team_a_max: teamAMax || 5,
      team_b_max: teamBMax || 5,
      created_by: createdBy,
      status: 'open',
    })
    .select()
    .single();

  return { data, error };
}

export async function getUserChatFixtures(userId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: created, error: createdError } = await supabase
    .from('fixtures')
    .select('*')
    .eq('created_by', userId)
    .eq('visibility', 'public')
    .neq('status', 'cancelled')
    .gte('date', today);

  const { data: joinedRows, error: joinedError } = await supabase
    .from('fixture_players')
    .select('fixtures(*)')
    .eq('user_id', userId);

  const joinedFixtures = (joinedRows || [])
    .map((row) => row.fixtures)
    .filter((fixture) => fixture && fixture.visibility === 'public' && fixture.status !== 'cancelled');

  const map = new Map();
  [...(created || []), ...joinedFixtures].forEach((fixture) => {
    if (fixture?.id) {
      map.set(fixture.id, fixture);
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => {
    const aDt = new Date(`${a.date}T${String(a.start_time).slice(0, 8)}`);
    const bDt = new Date(`${b.date}T${String(b.start_time).slice(0, 8)}`);
    return aDt - bDt;
  });

  return { data: merged, error: createdError || joinedError };
}
