import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import {
  createReservation,
  getUserReservations,
  cancelReservation,
  getReservationsByDate,
} from '../services/reservationService';
import { createFixture } from '../services/fixtureService';
import { COLORS, TIME_SLOTS } from '../theme';
import { ScreenHeader, EmptyState, GlassBackground } from '../components';

function getEndTime(start) {
  const [h, m] = start.split(':').map(Number);
  const end = new Date(0, 0, 0, h + 1, m);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function isValidDateFormat(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function isPastDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const dt = new Date(year, month - 1, day);
  dt.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dt < today;
}

function statusLabel(status) {
  if (status === 'confirmed') return 'Confirmée';
  if (status === 'pending_confirmation') return 'En attente';
  return 'Annulée';
}

function isPending(status) {
  return status === 'pending_confirmation';
}

function formatDeadline(ts) {
  if (!ts) return '15 minutes';
  try {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '15 minutes';
  }
}

export default function ReservationScreen({ navigation, route }) {
  const prefDate = route?.params?.date || new Date().toISOString().split('T')[0];
  const prefSlot = route?.params?.slot || null;

  const [tab, setTab] = useState('new');
  const [userId, setUserId] = useState(null);
  const [date, setDate] = useState(prefDate);
  const [selectedSlot, setSelectedSlot] = useState(prefSlot || TIME_SLOTS[0]);
  const [visibility, setVisibility] = useState('private');
  const [teamName, setTeamName] = useState('');
  const [notes, setNotes] = useState('');
  const [teamAName, setTeamAName] = useState('Équipe A');
  const [teamBName, setTeamBName] = useState('Équipe B');
  const [teamMax, setTeamMax] = useState('5');
  const [loading, setLoading] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setLoadingMine(true);
      const { data } = await getUserReservations(user.id);
      setMyReservations(data || []);
      setLoadingMine(false);
    };

    loadUser();
  }, []);

  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!isValidDateFormat(date)) {
        setBookedSlots([]);
        return;
      }

      setLoadingSlots(true);
      const { data } = await getReservationsByDate(date);
      const filtered = (data || [])
        .filter((r) => !editingId || r.id !== editingId)
        .map((r) => r.start_time?.slice(0, 5))
        .filter(Boolean);
      setBookedSlots(filtered);
      setLoadingSlots(false);
    };

    loadBookedSlots();
  }, [date, editingId]);

  useEffect(() => {
    if (route?.params?.date && isValidDateFormat(route.params.date)) {
      setDate(route.params.date);
    }

    if (route?.params?.slot && TIME_SLOTS.includes(route.params.slot)) {
      setSelectedSlot(route.params.slot);
    }
  }, [route?.params?.date, route?.params?.slot]);

  useEffect(() => {
    if (selectedSlot && !bookedSlots.includes(selectedSlot)) return;
    const firstAvailable = TIME_SLOTS.find((slot) => !bookedSlots.includes(slot));
    if (firstAvailable) setSelectedSlot(firstAvailable);
  }, [bookedSlots, selectedSlot]);

  const hasAvailableSlot = useMemo(
    () => TIME_SLOTS.some((slot) => !bookedSlots.includes(slot)),
    [bookedSlots]
  );

  const loadMine = useCallback(async (uid) => {
    setLoadingMine(true);
    const { data } = await getUserReservations(uid);
    setMyReservations(data || []);
    setLoadingMine(false);
  }, []);

  const resetForm = useCallback(() => {
    setTeamName('');
    setNotes('');
    setTeamAName('Équipe A');
    setTeamBName('Équipe B');
    setTeamMax('5');
    setVisibility('private');
    setEditingId(null);
  }, []);

  const startEdit = useCallback((reservation) => {
    setEditingId(reservation.id);
    setDate(reservation.date);
    setSelectedSlot(reservation.start_time?.slice(0, 5));
    setVisibility(reservation.visibility);
    setTeamName(reservation.team_name || '');
    setNotes(reservation.notes || '');
    setTab('new');
  }, []);

  const cancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleSubmit = async () => {
    if (!date) {
      Alert.alert('Erreur', 'Choisissez une date.');
      return;
    }
    if (!isValidDateFormat(date)) {
      Alert.alert('Erreur', 'Date invalide. Utilisez le format YYYY-MM-DD.');
      return;
    }
    if (isPastDate(date)) {
      Alert.alert('Erreur', 'Vous ne pouvez pas réserver une date passée.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Erreur', 'Choisissez un créneau.');
      return;
    }
    if (bookedSlots.includes(selectedSlot)) {
      Alert.alert('Erreur', 'Ce créneau est déjà réservé.');
      return;
    }
    if (!userId) {
      Alert.alert('Erreur', 'Session utilisateur introuvable. Reconnectez-vous.');
      return;
    }

    const maxPlayers = Number(teamMax);
    if (visibility === 'public' && (!Number.isInteger(maxPlayers) || maxPlayers <= 0 || maxPlayers > 11)) {
      Alert.alert('Erreur', 'Le nombre de joueurs par équipe doit être entre 1 et 11.');
      return;
    }

    setLoading(true);
    const startTime = `${selectedSlot}:00`;
    const endTime = `${getEndTime(selectedSlot)}:00`;

    if (editingId) {
      const { data: reservation, error } = await supabase
        .from('reservations')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          team_name: teamName.trim() || null,
          notes: notes.trim() || null,
          visibility,
        })
        .eq('id', editingId)
        .eq('user_id', userId)
        .select()
        .single();

      setLoading(false);

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      if (visibility === 'public') {
        const { data: existingFixture } = await supabase
          .from('fixtures')
          .select('id')
          .eq('reservation_id', editingId)
          .single();

        if (existingFixture) {
          await supabase
            .from('fixtures')
            .update({
              date,
              start_time: startTime,
              end_time: endTime,
              team_a_name: teamAName.trim() || 'Équipe A',
              team_b_name: teamBName.trim() || 'Équipe B',
              team_a_max: maxPlayers,
              team_b_max: maxPlayers,
            })
            .eq('id', existingFixture.id);
        } else {
          await createFixture({
            reservationId: reservation.id,
            createdBy: userId,
            date,
            startTime,
            endTime,
            teamAName: teamAName.trim() || 'Équipe A',
            teamBName: teamBName.trim() || 'Équipe B',
            teamAMax: maxPlayers,
            teamBMax: maxPlayers,
          });
        }
      } else {
        await supabase
          .from('fixtures')
          .update({ status: 'cancelled' })
          .eq('reservation_id', editingId);
      }

      Alert.alert('Réservation modifiée', 'Votre réservation a été mise à jour.');
      resetForm();
      setTab('mine');
      loadMine(userId);
      return;
    }

    const { data: reservation, error } = await createReservation({
      userId,
      date,
      startTime,
      endTime,
      teamName: teamName.trim() || null,
      notes: notes.trim() || null,
      visibility,
    });

    if (error || !reservation) {
      setLoading(false);
      Alert.alert('Erreur', error?.message || 'Échec de création de réservation.');
      return;
    }

    if (visibility === 'public') {
      const { error: fixtureError } = await createFixture({
        reservationId: reservation.id,
        createdBy: userId,
        date,
        startTime,
        endTime,
        teamAName: teamAName.trim() || 'Équipe A',
        teamBName: teamBName.trim() || 'Équipe B',
        teamAMax: maxPlayers,
        teamBMax: maxPlayers,
      });
      if (fixtureError) {
        setLoading(false);
        Alert.alert(
          'Réservation confirmée',
          `La réservation est créée, mais le match public a échoué: ${fixtureError.message}`
        );
        resetForm();
        setTab('mine');
        loadMine(userId);
        return;
      }
    }

    setLoading(false);
    Alert.alert('Réservation confirmée', 'Votre réservation est confirmée immédiatement.');
    resetForm();
    setTab('mine');
    loadMine(userId);
  };

  const handleCancel = (reservationId) => {
    Alert.alert(
      'Annuler la réservation ?',
      'Cette action est irréversible.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            await cancelReservation(reservationId, userId);
            loadMine(userId);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader title="Réservation" navigation={navigation} />

      <View style={styles.tabs}>
        {['new', 'mine'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => {
              setTab(t);
              if (t === 'new' && !editingId) resetForm();
            }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'new' ? (editingId ? 'Modifier' : '+ Nouvelle') : 'Mes réservations'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'new' ? (
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="ex: 2026-05-15"
            placeholderTextColor={COLORS.placeholder}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />

          <Text style={styles.label}>Créneau horaire</Text>
          {loadingSlots ? (
            <ActivityIndicator color={COLORS.green} style={styles.loadingSlotsIndicator} />
          ) : (
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map((s) => {
                const booked = bookedSlots.includes(s);
                const selected = selectedSlot === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.slotChip,
                      selected && styles.slotChipSelected,
                      booked && styles.slotChipBooked,
                    ]}
                    onPress={() => !booked && setSelectedSlot(s)}
                    disabled={booked}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        selected && styles.slotChipTextSelected,
                        booked && styles.slotChipTextBooked,
                      ]}
                    >
                      {booked ? `${s} (occupé)` : s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!hasAvailableSlot && (
            <Text style={styles.warningText}>Aucun créneau libre pour cette date.</Text>
          )}

          <Text style={styles.label}>Type de réservation</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[styles.visibilityBtn, visibility === 'private' && styles.visibilityBtnActive]}
              onPress={() => setVisibility('private')}
            >
              <Text style={[styles.visibilityText, visibility === 'private' && styles.visibilityTextActive]}>
                Privée
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visibilityBtn, visibility === 'public' && styles.visibilityBtnActive]}
              onPress={() => setVisibility('public')}
            >
              <Text style={[styles.visibilityText, visibility === 'public' && styles.visibilityTextActive]}>
                Publique
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.visibilityHint}>
            Publique: d'autres joueurs pourront rejoindre et discuter dans le chat du match.
          </Text>

          <Text style={styles.label}>Nom de l'équipe (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="ex: Les Lions de l'ISIMA"
            placeholderTextColor={COLORS.placeholder}
          />

          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Infos supplémentaires..."
            placeholderTextColor={COLORS.placeholder}
            multiline
          />

          {visibility === 'public' && (
            <View style={styles.publicCard}>
              <Text style={styles.publicCardTitle}>Configuration du match public</Text>
              <Text style={styles.label}>Nom équipe A</Text>
              <TextInput
                style={styles.input}
                value={teamAName}
                onChangeText={setTeamAName}
                placeholder="Équipe A"
                placeholderTextColor={COLORS.placeholder}
              />
              <Text style={styles.label}>Nom équipe B</Text>
              <TextInput
                style={styles.input}
                value={teamBName}
                onChangeText={setTeamBName}
                placeholder="Équipe B"
                placeholderTextColor={COLORS.placeholder}
              />
              <Text style={styles.label}>Joueurs max par équipe (1 à 11)</Text>
              <TextInput
                style={styles.input}
                value={teamMax}
                onChangeText={setTeamMax}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          )}

          <View style={styles.actionRow}>
            {editingId && (
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={cancelEdit}
                disabled={loading}
              >
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, (loading || !hasAvailableSlot) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || !hasAvailableSlot}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.green} />
              ) : (
                <Text style={styles.btnText}>{editingId ? 'Modifier la réservation' : 'Réserver'}</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.mineWrap} showsVerticalScrollIndicator={false}>
          {loadingMine ? (
            <ActivityIndicator color={COLORS.green} style={styles.loadingMineIndicator} />
          ) : myReservations.length === 0 ? (
            <EmptyState title="Aucune réservation" subtitle="Réservez un créneau pour commencer !" />
          ) : (
            myReservations.map((r) => (
              <View key={r.id} style={[styles.resCard, r.status === 'cancelled' && styles.resCardCancelled]}>
                <View style={styles.resRow}>
                  <Text style={styles.resDate}>{r.date}</Text>
                  <View
                    style={[
                      styles.resBadge,
                      r.status === 'confirmed'
                        ? styles.badgeConfirmed
                        : isPending(r.status)
                          ? styles.badgePending
                          : styles.badgeCancelled,
                    ]}
                  >
                    <Text style={styles.resBadgeText}>{statusLabel(r.status)}</Text>
                  </View>
                </View>
                <Text style={styles.resTime}>{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</Text>
                <Text style={styles.resTeam}>Type: {r.visibility === 'public' ? 'Publique' : 'Privée'}</Text>
                {r.team_name && <Text style={styles.resTeam}>Équipe: {r.team_name}</Text>}
                {isPending(r.status) && (
                  <Text style={styles.pendingHint}>
                    Confirmation email requise avant {formatDeadline(r.confirmation_deadline)}.
                  </Text>
                )}
                {r.status !== 'cancelled' && !isPending(r.status) && (
                  <View style={styles.resActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(r)}>
                      <Text style={styles.editBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(r.id)}>
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  notesInput: { height: 80, textAlignVertical: 'top' },
  bottomSpacer: { height: 40 },
  loadingMineIndicator: { marginTop: 40 },
  loadingSlotsIndicator: { marginVertical: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  tabActive: {
    backgroundColor: COLORS.greenDimStrong,
    borderColor: COLORS.green,
  },
  tabText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: COLORS.green, fontWeight: '800' },
  form: { paddingHorizontal: 20 },
  label: { color: COLORS.fieldLabel, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.inputText,
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  slotChipSelected: {
    backgroundColor: COLORS.greenDimStrong,
    borderColor: COLORS.green,
  },
  slotChipBooked: { backgroundColor: COLORS.bgCardAlt, borderColor: COLORS.textTertiary },
  slotChipText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  slotChipTextSelected: { color: COLORS.green, fontWeight: '800' },
  slotChipTextBooked: { color: COLORS.textTertiary },
  warningText: { color: COLORS.red, fontWeight: '700', marginTop: 12 },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
  },
  visibilityBtnActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenDim,
  },
  visibilityText: { color: COLORS.fieldLabel, fontWeight: '700' },
  visibilityTextActive: { color: COLORS.green, fontWeight: '800' },
  visibilityHint: { color: COLORS.placeholder, fontSize: 12, marginTop: 8 },
  publicCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.bgCardAlt,
  },
  publicCardTitle: { color: COLORS.white, fontWeight: '800', marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: {
    flex: 1,
    backgroundColor: COLORS.greenDimStrong,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: COLORS.redDim,
    borderColor: COLORS.redBorder,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: COLORS.green, fontWeight: '800', fontSize: 15 },
  mineWrap: { paddingHorizontal: 20, paddingTop: 4 },
  resCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  resCardCancelled: { opacity: 0.45 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resDate: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  resBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeConfirmed: { backgroundColor: COLORS.greenDim },
  badgePending: { backgroundColor: COLORS.yellowDim },
  badgeCancelled: { backgroundColor: COLORS.redDim },
  resBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.whiteMuted },
  resTime: { color: COLORS.fieldLabel, fontSize: 13, marginBottom: 4 },
  resTeam: { color: COLORS.textSecondary, fontSize: 13 },
  pendingHint: { color: COLORS.yellow, marginTop: 6, fontSize: 12 },
  resActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.greenDim,
  },
  editBtnText: { color: COLORS.green, fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.redDim,
  },
  cancelBtnText: { color: COLORS.red, fontWeight: '700', fontSize: 13 },
});
