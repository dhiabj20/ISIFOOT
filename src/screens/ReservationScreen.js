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
import Icon from 'react-native-vector-icons/Feather';
import { supabase } from '../services/supabase';
import {
  createReservation,
  getUserReservations,
  cancelReservation,
  getReservationsByDate,
} from '../services/reservationService';
import { createFixture, joinFixture } from '../services/fixtureService';
import { TIME_SLOTS } from '../theme';
import { useTheme } from '../context/ThemeContext';
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

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSlotPassed(dateKey, slot, now = new Date()) {
  if (!isValidDateFormat(dateKey) || !slot) {
    return false;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = slot.split(':').map(Number);
  const slotDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return slotDateTime < now;
}

export default function ReservationScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prefDate = route?.params?.date || toLocalDateKey(new Date());
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
  const [teamMax, setTeamMax] = useState('6');
  const [loading, setLoading] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

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
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => clearInterval(timer);
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
    const now = new Date(nowTick);
    if (selectedSlot && !bookedSlots.includes(selectedSlot) && !isSlotPassed(date, selectedSlot, now)) return;
    const firstAvailable = TIME_SLOTS.find((slot) => !bookedSlots.includes(slot) && !isSlotPassed(date, slot, now));
    if (firstAvailable) setSelectedSlot(firstAvailable);
  }, [bookedSlots, selectedSlot, date, nowTick]);

  const hasAvailableSlot = useMemo(
    () => TIME_SLOTS.some((slot) => !bookedSlots.includes(slot) && !isSlotPassed(date, slot, new Date(nowTick))),
    [bookedSlots, date, nowTick]
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
    setTeamMax('6');
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
    if (isSlotPassed(date, selectedSlot)) {
      Alert.alert('Erreur', 'Ce créneau est déjà passé.');
      return;
    }
    if (!userId) {
      Alert.alert('Erreur', 'Session utilisateur introuvable. Reconnectez-vous.');
      return;
    }

    const maxPlayers = visibility === 'public' ? 6 : Number(teamMax);

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
          const { data: newFixture, error: newFixtureError } = await createFixture({
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
          if (newFixtureError) {
            setLoading(false);
            Alert.alert('Erreur', `Impossible de créer le match public: ${newFixtureError.message}`);
            return;
          }

          const { error: joinError } = await joinFixture({ fixtureId: newFixture.id, userId, team: 'A' });
          if (joinError) {
            Alert.alert('Info', `Match créé, mais ajout automatique dans l'équipe A impossible: ${joinError.message}`);
          }
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
      const { data: fixture, error: fixtureError } = await createFixture({
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

      const { error: joinError } = await joinFixture({ fixtureId: fixture.id, userId, team: 'A' });
      if (joinError) {
        Alert.alert('Info', `Réservation créée, mais ajout automatique dans l'équipe A impossible: ${joinError.message}`);
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader title="Réservation" showBack={false} navigation={navigation} />

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
            placeholderTextColor={colors.placeholder}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />

          <Text style={styles.label}>Créneau horaire</Text>
          {loadingSlots ? (
            <ActivityIndicator color={colors.green} style={styles.loadingSlotsIndicator} />
          ) : (
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map((s) => {
                const booked = bookedSlots.includes(s);
                const passed = isSlotPassed(date, s);
                const disabled = booked || passed;
                const selected = selectedSlot === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.slotChip,
                      selected && styles.slotChipSelected,
                      disabled && styles.slotChipBooked,
                    ]}
                    onPress={() => !disabled && setSelectedSlot(s)}
                    disabled={disabled}
                  >
                    <View style={styles.slotChipContent}>
                      <Text
                        style={[
                          styles.slotChipText,
                          selected && styles.slotChipTextSelected,
                          disabled && styles.slotChipTextBooked,
                        ]}
                      >
                        {booked ? `${s} (occupé)` : s}
                      </Text>
                      {passed && !booked ? (
                        <Icon
                          name="lock"
                          size={12}
                          color={colors.textTertiary}
                          style={styles.slotLockIcon}
                        />
                      ) : null}
                    </View>
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

          {visibility === 'private' && (
            <>
              <Text style={styles.label}>Nom de l'équipe (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="ex: Les Lions de l'ISIMA"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.label}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Infos supplémentaires..."
                placeholderTextColor={colors.placeholder}
                multiline
              />
            </>
          )}

          {visibility === 'public' && (
            <View style={styles.publicCard}>
              <Text style={styles.publicCardTitle}>Configuration du match public</Text>
              <Text style={styles.label}>Nom équipe A</Text>
              <TextInput
                style={styles.input}
                value={teamAName}
                onChangeText={setTeamAName}
                placeholder="Équipe A"
                placeholderTextColor={colors.placeholder}
              />
              <Text style={styles.label}>Nom équipe B</Text>
              <TextInput
                style={styles.input}
                value={teamBName}
                onChangeText={setTeamBName}
                placeholder="Équipe B"
                placeholderTextColor={colors.placeholder}
              />
              <Text style={styles.label}>Joueurs max par équipe (fixe: 6)</Text>
              <TextInput
                style={styles.input}
                value={teamMax}
                onChangeText={setTeamMax}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor={colors.placeholder}
                editable={false}
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
                <ActivityIndicator color={colors.green} />
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
            <ActivityIndicator color={colors.green} style={styles.loadingMineIndicator} />
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

function createStyles(colors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  notesInput: { height: 80, textAlignVertical: 'top' },
  bottomSpacer: { height: 120 },
  loadingMineIndicator: { marginTop: 40 },
  loadingSlotsIndicator: { marginVertical: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  tabActive: {
    backgroundColor: colors.greenDimStrong,
    borderColor: colors.green,
  },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: colors.green, fontWeight: '800' },
  form: { paddingHorizontal: 20 },
  label: { color: colors.fieldLabel, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.inputText,
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  slotChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLockIcon: {
    marginLeft: 6,
  },
  slotChipSelected: {
    backgroundColor: colors.greenDimStrong,
    borderColor: colors.green,
  },
  slotChipBooked: { backgroundColor: colors.bgCardAlt, borderColor: colors.textTertiary },
  slotChipText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  slotChipTextSelected: { color: colors.green, fontWeight: '800' },
  slotChipTextBooked: { color: colors.textTertiary },
  warningText: { color: colors.red, fontWeight: '700', marginTop: 12 },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
  },
  visibilityBtnActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenDim,
  },
  visibilityText: { color: colors.fieldLabel, fontWeight: '700' },
  visibilityTextActive: { color: colors.green, fontWeight: '800' },
  visibilityHint: { color: colors.placeholder, fontSize: 12, marginTop: 8 },
  publicCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.bgCardAlt,
  },
  publicCardTitle: { color: colors.white, fontWeight: '800', marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: {
    flex: 1,
    backgroundColor: colors.greenDimStrong,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: colors.redDim,
    borderColor: colors.redBorder,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.green, fontWeight: '800', fontSize: 15 },
  mineWrap: { paddingHorizontal: 20, paddingTop: 4 },
  resCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  resCardCancelled: { opacity: 0.45 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resDate: { color: colors.white, fontWeight: '800', fontSize: 15 },
  resBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeConfirmed: { backgroundColor: colors.greenDim },
  badgePending: { backgroundColor: colors.yellowDim },
  badgeCancelled: { backgroundColor: colors.redDim },
  resBadgeText: { fontSize: 11, fontWeight: '700', color: colors.whiteMuted },
  resTime: { color: colors.fieldLabel, fontSize: 13, marginBottom: 4 },
  resTeam: { color: colors.textSecondary, fontSize: 13 },
  pendingHint: { color: colors.yellow, marginTop: 6, fontSize: 12 },
  resActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.greenDim,
  },
  editBtnText: { color: colors.green, fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.redBorder,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.redDim,
  },
  cancelBtnText: { color: colors.red, fontWeight: '700', fontSize: 13 },
  });
}
