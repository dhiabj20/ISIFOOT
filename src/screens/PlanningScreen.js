// src/screens/PlanningScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { getReservationsByDate } from '../services/reservationService';

const DARK = '#06120C';
const CARD = '#10231A';
const BLUE = '#2BE67B';
const BORDER = '#1A3628';
const GREEN = '#2BE67B';

const TIME_SLOTS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00',
];

const daysOfWeek = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function getWeekDays(baseDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
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

  const isBooked = (slot) =>
    reservations.some((r) => r.start_time?.slice(0, 5) === slot);

  const getReservationFor = (slot) =>
    reservations.find((r) => r.start_time?.slice(0, 5) === slot);

  const formatDate = (d) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const shiftWeek = (n) => {
    const nd = new Date(weekStart);
    nd.setDate(nd.getDate() + n * 7);
    setWeekStart(nd);
  };

  const isToday = (d) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const isSelected = (d) =>
    d.toDateString() === selectedDate.toDateString();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Planning du Terrain</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Week navigator */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>‹</Text>
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
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Selected date label */}
      <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
          <Text style={styles.legendText}>Disponible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendBookedDot]} />
          <Text style={styles.legendText}>Réservé</Text>
        </View>
      </View>

      {/* Time Slots */}
      {loading ? (
        <ActivityIndicator style={styles.loadingIndicator} color={BLUE} size="large" />
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
                      <Text style={styles.slotBookedLabel}>Réservé</Text>
                      {res?.profiles?.full_name && (
                        <Text style={styles.slotBookedBy}>par {res.profiles.full_name}</Text>
                      )}
                      {res?.team_name && (
                        <Text style={styles.slotTeam}>🏆 {res.team_name}</Text>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Reservation', { date: selectedDate.toISOString().split('T')[0], slot })}
                    >
                      <Text style={styles.slotFree}>Disponible — Réserver →</Text>
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
  root: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { color: BLUE, fontWeight: '700', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSpacer: { width: 70 },
  loadingIndicator: { marginTop: 40 },
  bottomSpacer: { height: 40 },

  weekNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, marginBottom: 4,
  },
  navArrow: { padding: 8 },
  navArrowText: { color: BLUE, fontSize: 24, fontWeight: '300' },
  weekScroll: { flex: 1 },
  dayBtn: {
    alignItems: 'center', padding: 10, marginHorizontal: 4,
    borderRadius: 12, minWidth: 44,
  },
  dayBtnSelected: { backgroundColor: BLUE },
  dayBtnToday: { backgroundColor: '#1A2A44' },
  dayName: { color: '#5A7A9A', fontSize: 11, fontWeight: '600' },
  dayNum: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 2 },
  dayTextSelected: { color: '#FFFFFF' },

  dateLabel: {
    paddingHorizontal: 20, fontSize: 14, color: '#8AACCC',
    fontWeight: '600', textTransform: 'capitalize', marginBottom: 8,
  },

  legend: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendBookedDot: { backgroundColor: '#FF4D4D' },
  legendText: { color: '#5A7A9A', fontSize: 12 },

  slotsWrap: { paddingHorizontal: 20 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 8,
  },
  slotRowBooked: { borderColor: '#FF4D4D33', backgroundColor: '#1A1225' },
  slotTime: { color: '#8AACCC', fontWeight: '800', fontSize: 14, width: 52 },
  slotInfo: { flex: 1, paddingHorizontal: 10 },
  slotFree: { color: '#00C896', fontWeight: '700', fontSize: 13 },
  slotBookedLabel: { color: '#FF6B6B', fontWeight: '800', fontSize: 13 },
  slotBookedBy: { color: '#5A7A9A', fontSize: 12, marginTop: 2 },
  slotTeam: { color: '#8AACCC', fontSize: 12, marginTop: 2 },
  slotDot: { width: 10, height: 10, borderRadius: 5 },
  slotDotBooked: { backgroundColor: '#FF4D4D' },
  slotDotFree: { backgroundColor: GREEN },
});
