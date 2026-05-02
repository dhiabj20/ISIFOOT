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

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      date,
      start_time: startTime,
      end_time: endTime,
      team_name: teamName,
      notes,
      visibility: selectedVisibility,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();

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
  return { data, error };
}
