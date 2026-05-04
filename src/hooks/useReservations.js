import { useState, useCallback } from 'react';
import { getUserReservations, createReservation, cancelReservation, getReservationsByDate } from '../services/reservationService';

export function useReservations(userId) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReservations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await getUserReservations(userId);
    setReservations(data || []);
    setLoading(false);
  }, [userId]);

  const addReservation = useCallback(async (params) => {
    const { data, error } = await createReservation(params);
    if (!error) {
      setReservations((prev) => [...prev, data]);
    }
    return { data, error };
  }, []);

  const removeReservation = useCallback(async (reservationId) => {
    await cancelReservation(reservationId, userId);
    setReservations((prev) => prev.map((r) => r.id === reservationId ? { ...r, status: 'cancelled' } : r));
  }, [userId]);

  return {
    reservations,
    loading,
    loadReservations,
    addReservation,
    removeReservation,
  };
}

export async function fetchReservationsByDate(date) {
  const { data } = await getReservationsByDate(date);
  return data || [];
}
