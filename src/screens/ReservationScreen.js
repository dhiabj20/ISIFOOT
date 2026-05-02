// src/screens/ReservationScreen.js
import React, { useEffect, useMemo, useState } from 'react';
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

const DARK = '#06120C';
const CARD = '#10231A';
const BLUE = '#2BE67B';
const GREEN = '#2BE67B';
const BORDER = '#1A3628';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

function getEndTime(start) {
  const [h, m] = start.split(':').map(Number);
  const end = new Date(0, 0, 0, h + 1, m);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function isValidDateFormat(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) { return false; }
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
  if (status === 'confirmed') { return 'Confirmee'; }
  if (status === 'pending_confirmation') { return 'En attente'; }
  return 'Annulee';
}

function isPending(status) {
  return status === 'pending_confirmation';
}

function formatDeadline(ts) {
  if (!ts) { return '15 minutes'; }
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
  const [teamAName, setTeamAName] = useState('Equipe A');
  const [teamBName, setTeamBName] = useState('Equipe B');
  const [teamMax, setTeamMax] = useState('5');
  const [loading, setLoading] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      setUserId(user.id);
      loadMine(user.id);
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
      const slots = (data || []).map((r) => r.start_time?.slice(0, 5)).filter(Boolean);
      setBookedSlots(slots);
      setLoadingSlots(false);
    };

    loadBookedSlots();
  }, [date]);

  useEffect(() => {
    if (route?.params?.date && isValidDateFormat(route.params.date)) {
      setDate(route.params.date);
    }

    if (route?.params?.slot && TIME_SLOTS.includes(route.params.slot)) {
      setSelectedSlot(route.params.slot);
    }
  }, [route?.params?.date, route?.params?.slot]);

  useEffect(() => {
    if (selectedSlot && !bookedSlots.includes(selectedSlot)) {
      return;
    }
    const firstAvailable = TIME_SLOTS.find((slot) => !bookedSlots.includes(slot));
    if (firstAvailable) {
      setSelectedSlot(firstAvailable);
    }
  }, [bookedSlots, selectedSlot]);

  const hasAvailableSlot = useMemo(
    () => TIME_SLOTS.some((slot) => !bookedSlots.includes(slot)),
    [bookedSlots]
  );

  const loadMine = async (uid) => {
    setLoadingMine(true);
    const { data } = await getUserReservations(uid);
    setMyReservations(data || []);
    setLoadingMine(false);
  };

  const resetForm = () => {
    setTeamName('');
    setNotes('');
    setTeamAName('Equipe A');
    setTeamBName('Equipe B');
    setTeamMax('5');
    setVisibility('private');
  };

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
      Alert.alert('Erreur', 'Vous ne pouvez pas reserver une date passee.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Erreur', 'Choisissez un creneau.');
      return;
    }
    if (bookedSlots.includes(selectedSlot)) {
      Alert.alert('Erreur', 'Ce creneau est deja reserve.');
      return;
    }
    if (!userId) {
      Alert.alert('Erreur', 'Session utilisateur introuvable. Reconnectez-vous.');
      return;
    }

    const maxPlayers = Number(teamMax);
    if (visibility === 'public' && (!Number.isInteger(maxPlayers) || maxPlayers <= 0 || maxPlayers > 11)) {
      Alert.alert('Erreur', 'Le nombre de joueurs par equipe doit etre entre 1 et 11.');
      return;
    }

    setLoading(true);
    const startTime = `${selectedSlot}:00`;
    const endTime = `${getEndTime(selectedSlot)}:00`;

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
      Alert.alert('Erreur', error?.message || 'Echec de creation de reservation.');
      return;
    }

    if (visibility === 'public') {
      const { error: fixtureError } = await createFixture({
        reservationId: reservation.id,
        createdBy: userId,
        date,
        startTime,
        endTime,
        teamAName: teamAName.trim() || 'Equipe A',
        teamBName: teamBName.trim() || 'Equipe B',
        teamAMax: maxPlayers,
        teamBMax: maxPlayers,
      });
      if (fixtureError) {
        setLoading(false);
        Alert.alert(
          'Reservation confirmee',
          `La reservation est creee, mais la fixture publique a echoue: ${fixtureError.message}`
        );
        resetForm();
        setTab('mine');
        loadMine(userId);
        return;
      }
    }

    setLoading(false);
    Alert.alert('Reservation confirmee', 'Votre reservation est confirmee immediatement.');
    resetForm();
    setTab('mine');
    loadMine(userId);
  };

  const handleCancel = (reservationId) => {
    Alert.alert(
      'Annuler la reservation ?',
      'Cette action est irreversible.',
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
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reservation</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {['new', 'mine'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'new' ? '+ Nouvelle reservation' : 'Mes reservations'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'new' ? (
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="ex: 2026-05-15"
            placeholderTextColor="#6B7B8D"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />

          <Text style={styles.label}>Creneau horaire</Text>
          {loadingSlots ? (
            <ActivityIndicator color={BLUE} style={styles.loadingSlotsIndicator} />
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
                      {booked ? `${s} (occupe)` : s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!hasAvailableSlot && (
            <Text style={styles.warningText}>Aucun creneau libre pour cette date.</Text>
          )}

          <Text style={styles.label}>Type de reservation</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[styles.visibilityBtn, visibility === 'private' && styles.visibilityBtnActive]}
              onPress={() => setVisibility('private')}
            >
              <Text style={[styles.visibilityText, visibility === 'private' && styles.visibilityTextActive]}>
                Privee
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
            Publique: d autres joueurs pourront rejoindre et discuter dans le chat du match.
          </Text>

          <Text style={styles.label}>Nom de l equipe (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="ex: Les Lions de l ISIMA"
            placeholderTextColor="#6B7B8D"
          />

          <Text style={styles.label}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Infos supplementaires..."
            placeholderTextColor="#6B7B8D"
            multiline
          />

          {visibility === 'public' && (
            <View style={styles.publicCard}>
              <Text style={styles.publicCardTitle}>Configuration du match public</Text>
              <Text style={styles.label}>Nom equipe A</Text>
              <TextInput
                style={styles.input}
                value={teamAName}
                onChangeText={setTeamAName}
                placeholder="Equipe A"
                placeholderTextColor="#6B7B8D"
              />
              <Text style={styles.label}>Nom equipe B</Text>
              <TextInput
                style={styles.input}
                value={teamBName}
                onChangeText={setTeamBName}
                placeholder="Equipe B"
                placeholderTextColor="#6B7B8D"
              />
              <Text style={styles.label}>Joueurs max par equipe (1 a 11)</Text>
              <TextInput
                style={styles.input}
                value={teamMax}
                onChangeText={setTeamMax}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor="#6B7B8D"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (loading || !hasAvailableSlot) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !hasAvailableSlot}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Reserver et demander confirmation</Text>
            )}
          </TouchableOpacity>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.mineWrap} showsVerticalScrollIndicator={false}>
          {loadingMine ? (
            <ActivityIndicator color={BLUE} style={styles.loadingMineIndicator} />
          ) : myReservations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Vous n avez pas encore de reservations</Text>
            </View>
          ) : (
            myReservations.map((r) => (
              <View key={r.id} style={[styles.resCard, r.status === 'cancelled' && styles.resCardCancelled]}>
                <View style={styles.resRow}>
                  <Text style={styles.resDate}>Date: {r.date}</Text>
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
                <Text style={styles.resTeam}>Type: {r.visibility === 'public' ? 'Publique' : 'Privee'}</Text>
                {r.team_name && <Text style={styles.resTeam}>Equipe: {r.team_name}</Text>}
                {isPending(r.status) && (
                  <Text style={styles.pendingHint}>
                    Confirmation email requise avant {formatDeadline(r.confirmation_deadline)}.
                  </Text>
                )}
                {r.status !== 'cancelled' && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(r.id)}>
                    <Text style={styles.cancelBtnText}>Annuler cette reservation</Text>
                  </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { color: BLUE, fontWeight: '700', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSpacer: { width: 70 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  bottomSpacer: { height: 40 },
  loadingMineIndicator: { marginTop: 40 },
  loadingSlotsIndicator: { marginVertical: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabActive: { backgroundColor: BLUE, borderColor: BLUE },
  tabText: { color: '#5A7A9A', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
  form: { paddingHorizontal: 20 },
  label: { color: '#8AACCC', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#E8F0FE',
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  slotChipSelected: { backgroundColor: BLUE, borderColor: BLUE },
  slotChipBooked: { backgroundColor: '#1B1D2A', borderColor: '#3A4053' },
  slotChipText: { color: '#5A7A9A', fontWeight: '700', fontSize: 13 },
  slotChipTextSelected: { color: '#FFF' },
  slotChipTextBooked: { color: '#8A90A6' },
  warningText: { color: '#FF8F8F', fontWeight: '700', marginTop: 12 },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: CARD,
  },
  visibilityBtnActive: {
    borderColor: BLUE,
    backgroundColor: '#10305F',
  },
  visibilityText: { color: '#8AACCC', fontWeight: '700' },
  visibilityTextActive: { color: '#FFF' },
  visibilityHint: { color: '#6B7B8D', fontSize: 12, marginTop: 8 },
  publicCard: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#0F1B2D',
  },
  publicCardTitle: { color: '#FFF', fontWeight: '800', marginTop: 12 },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  mineWrap: { paddingHorizontal: 20, paddingTop: 4 },
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyText: { color: '#5A7A9A', fontSize: 14 },
  resCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  resCardCancelled: { opacity: 0.5 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resDate: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  resBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeConfirmed: { backgroundColor: '#00C89620' },
  badgePending: { backgroundColor: '#FFB80020' },
  badgeCancelled: { backgroundColor: '#FF4D4D20' },
  resBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  resTime: { color: '#8AACCC', fontSize: 13, marginBottom: 4 },
  resTeam: { color: '#5A7A9A', fontSize: 13 },
  pendingHint: { color: '#F2C861', marginTop: 6, fontSize: 12 },
  cancelBtn: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4D4D',
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#FF4D4D', fontWeight: '700', fontSize: 13 },
});
