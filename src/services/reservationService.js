// src/services/reservationService.js
import { supabase } from './supabase';

export async function getReservationsByDate(date) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, profiles(full_name, username)')
    .eq('date', date)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  return { data, error };
}

export async function getUserReservations(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  return { data, error };
}

export async function createReservation({
  userId,
  date,
  startTime,
  endTime,
  teamName,
  notes,
  visibility,
}) {
  const selectedVisibility = visibility === 'public' ? 'public' : 'private';

  const { data: conflict } = await supabase
    .from('reservations')
    .select('id')
    .eq('date', date)
    .eq('start_time', startTime)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (conflict) {
    return { error: { message: 'Ce creneau est deja reserve.' } };
  }

  const payload = {
    user_id: userId,
    date,
    start_time: startTime,
    end_time: endTime,
    team_name: teamName,
    notes,
    visibility: selectedVisibility,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    confirmation_token: null,
    confirmation_deadline: null,
  };

  const { data, error } = await supabase
    .from('reservations')
    .insert(payload)
    .select()
    .single();

  // Legacy DBs may still have a hard unique key on (date, start_time),
  // which blocks new inserts even when the old reservation is cancelled.
  // In that case, reuse the cancelled row by updating it in place.
  const duplicateKey =
    error?.code === '23505' ||
    String(error?.message || '').toLowerCase().includes('duplicate key value');

  if (duplicateKey) {
    const { data: sameSlot } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('date', date)
      .eq('start_time', startTime)
      .maybeSingle();

    if (sameSlot?.status === 'cancelled') {
      const { data: recycled, error: recycleError } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', sameSlot.id)
        .select()
        .single();

      return { data: recycled, error: recycleError };
    }
  }

  return { data, error };
}

export async function confirmReservation({ reservationId, token }) {
  const { data, error } = await supabase.rpc('confirm_reservation', {
    _reservation_id: reservationId,
    _token: token,
  });
  return { data, error };
}

export async function cancelReservation(reservationId, userId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({
      status: 'cancelled',
      confirmation_token: null,
      confirmation_deadline: null,
    })
    .eq('id', reservationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Keep fixture status in sync when a reservation is cancelled.
  const { error: fixtureError } = await supabase
    .from('fixtures')
    .update({
      status: 'cancelled',
    })
    .eq('reservation_id', reservationId)
    .neq('status', 'cancelled');

  if (fixtureError) {
    return { data, error: fixtureError };
  }

  return { data, error: null };
}
