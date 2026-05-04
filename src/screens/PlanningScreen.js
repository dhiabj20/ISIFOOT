import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { getReservationsByDate } from '../services/reservationService';
import { COLORS, TIME_SLOTS } from '../theme';
import { GlassBackground, ScreenHeader } from '../components';

const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function getWeekDays(baseDate) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function PlanningScreen({ navigation }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const weekDays = getWeekDays(weekStart);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    const iso = selectedDate.toISOString().split('T')[0];
    const { data } = await getReservationsByDate(iso);
    setReservations(data || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const isBooked = (slot) => reservations.some((r) => r.start_time?.slice(0, 5) === slot);

  const getReservationFor = (slot) => reservations.find((r) => r.start_time?.slice(0, 5) === slot);

  const formatDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const shiftWeek = (n) => {
    const nd = new Date(weekStart);
    nd.setDate(nd.getDate() + n * 7);
    setWeekStart(nd);
  };

  const isToday = (d) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const isSelected = (d) => d.toDateString() === selectedDate.toDateString();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader title="Planning du Terrain" navigation={navigation} />

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          {weekDays.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayBtn,
                isSelected(d) && styles.dayBtnSelected,
                isToday(d) && !isSelected(d) && styles.dayBtnToday,
              ]}
              onPress={() => setSelectedDate(new Date(d))}
            >
              <Text style={[styles.dayName, isSelected(d) && styles.dayTextSelected]}>
                {daysOfWeek[d.getDay()]}
              </Text>
              <Text style={[styles.dayNum, isSelected(d) && styles.dayTextSelected]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => shiftWeek(1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Disponible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
          <Text style={styles.legendText}>Reserve</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loadingIndicator} color={COLORS.green} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.slotsWrap} showsVerticalScrollIndicator={false}>
          {TIME_SLOTS.map((slot) => {
            const booked = isBooked(slot);
            const res = getReservationFor(slot);
            return (
              <View key={slot} style={[styles.slotRow, booked && styles.slotRowBooked]}>
                <Text style={styles.slotTime}>{slot}</Text>
                <View style={styles.slotInfo}>
                  {booked ? (
                    <>
                      <Text style={styles.slotBookedLabel}>Reserve</Text>
                      {res?.profiles?.full_name ? (
                        <Text style={styles.slotBookedBy}>par {res.profiles.full_name}</Text>
                      ) : null}
                      {res?.team_name ? <Text style={styles.slotTeam}>Equipe: {res.team_name}</Text> : null}
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Reservation', { date: selectedDate.toISOString().split('T')[0], slot })}
                    >
                      <Text style={styles.slotFree}>Disponible - Reserver</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.slotDot, booked ? styles.slotDotBooked : styles.slotDotFree]} />
              </View>
            );
          })}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingIndicator: { marginTop: 40 },
  bottomSpacer: { height: 40 },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  navArrow: { padding: 8 },
  navArrowText: { color: COLORS.green, fontSize: 24, fontWeight: '300' },
  weekScroll: { flex: 1 },
  dayBtn: {
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 14,
    minWidth: 44,
  },
  dayBtnSelected: {
    backgroundColor: COLORS.greenDimStrong,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  dayBtnToday: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  dayName: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  dayNum: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginTop: 2 },
  dayTextSelected: { color: COLORS.green },

  dateLabel: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: COLORS.fieldLabel,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 8,
  },

  legend: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textSecondary, fontSize: 12 },

  slotsWrap: { paddingHorizontal: 20 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    padding: 14,
    marginBottom: 8,
  },
  slotRowBooked: {
    borderColor: COLORS.redBorder,
    backgroundColor: COLORS.redDim,
  },
  slotTime: { color: COLORS.fieldLabel, fontWeight: '800', fontSize: 14, width: 52 },
  slotInfo: { flex: 1, paddingHorizontal: 10 },
  slotFree: { color: COLORS.green, fontWeight: '700', fontSize: 13 },
  slotBookedLabel: { color: COLORS.red, fontWeight: '800', fontSize: 13 },
  slotBookedBy: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  slotTeam: { color: COLORS.fieldLabel, fontSize: 12, marginTop: 2 },
  slotDot: { width: 10, height: 10, borderRadius: 5 },
  slotDotBooked: { backgroundColor: COLORS.red },
  slotDotFree: { backgroundColor: COLORS.green },
});
