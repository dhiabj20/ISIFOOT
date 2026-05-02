// src/screens/HomeScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getUserReservations } from '../services/reservationService';
import { getUserChatFixtures } from '../services/fixtureService';

const DARK = '#06120C';
const CARD = '#10231A';
const BORDER = '#1A3628';
const GREEN = '#2BE67B';
const MUTED = '#8AA59A';
const WHITE = '#F4FFF8';
const { width } = Dimensions.get('window');

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDateTime(date, time) {
  return new Date(`${date}T${String(time).slice(0, 8)}`);
}

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [myReservations, setMyReservations] = useState([]);
  const [myPublicFixtures, setMyPublicFixtures] = useState([]);
  const [joinedFixturesCount, setJoinedFixturesCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: me } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(me || null);

      const { data: reservations } = await getUserReservations(user.id);
      setMyReservations(reservations || []);

      const { data: myFixtures } = await getUserChatFixtures(user.id);
      setMyPublicFixtures(myFixtures || []);

      const { count: joinedCount } = await supabase
        .from('fixture_players')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setJoinedFixturesCount(joinedCount || 0);

      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const upcoming = myReservations.filter((r) => {
      if (r.status === 'cancelled') {
        return false;
      }
      return buildDateTime(r.date, r.start_time) >= now;
    }).length;

    const thisMonthReservations = myReservations.filter((r) => {
      const reservationDate = buildDateTime(r.date, r.start_time);
      return reservationDate >= monthStart;
    }).length;

    const todays = myReservations.filter((r) => sameDay(buildDateTime(r.date, r.start_time), now)).length;

    return {
      created: myReservations.length,
      joinedOrCreated: joinedFixturesCount + myPublicFixtures.length,
      thisMonth: thisMonthReservations,
      upcoming,
      today: todays,
    };
  }, [myReservations, joinedFixturesCount, myPublicFixtures]);

  const upcomingReservations = useMemo(() => {
    const now = new Date();
    return myReservations
      .filter((r) => r.status !== 'cancelled' && buildDateTime(r.date, r.start_time) >= now)
      .sort((a, b) => buildDateTime(a.date, a.start_time) - buildDateTime(b.date, b.start_time))
      .slice(0, 4);
  }, [myReservations]);

  const goTab = (tab) => navigation.navigate('MainTabs', { screen: tab });

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={DARK} />
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hello, {profile?.full_name?.split(' ')[0] || 'Student'} 👋</Text>
            <Text style={styles.sub}>GLSI2C · ISIMA Mahdia</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => goTab('Profile')}>
            <Text style={styles.avatarText}>
              {(profile?.full_name?.[0] || profile?.username?.[0] || 'S').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {[
            { value: stats.created, label: 'My Bookings' },
            { value: stats.upcoming, label: 'Upcoming' },
            { value: stats.joinedOrCreated, label: 'Joined/Created' },
            { value: stats.thisMonth, label: 'This Month' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>UPCOMING RESERVATIONS</Text>
        {upcomingReservations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No upcoming reservations yet.</Text>
          </View>
        ) : (
          upcomingReservations.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.resCard}
              onPress={() => goTab('Reservation')}
              activeOpacity={0.85}
            >
              <View style={styles.resLeft}>
                <Text style={styles.resDate}>
                  {new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.resTime}>{r.start_time?.slice(0, 5)}</Text>
              </View>
              <View style={styles.resMiddle}>
                <Text style={styles.resName}>{r.team_name || 'Reservation ISIFOOT'}</Text>
                <Text style={styles.resSub}>
                  {r.visibility === 'public' ? 'Public reservation' : 'Private reservation'}
                </Text>
              </View>
              <View style={[styles.resBadge, r.status === 'confirmed' ? styles.badgeOk : styles.badgePending]}>
                <Text style={styles.resBadgeText}>
                  {r.status === 'confirmed' ? 'BOOKED' : 'PENDING'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { color: WHITE, fontSize: 22, fontWeight: '900', letterSpacing: 0.4 },
  sub: { color: MUTED, fontSize: 12, marginTop: 4 },
  avatarBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1A7D43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#CFFFDF', fontWeight: '900', fontSize: 22 },
  sectionTitle: {
    color: '#7D9C8E',
    letterSpacing: 3,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 24,
    marginBottom: 12,
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: { color: WHITE, fontSize: 30, fontWeight: '900' },
  statLabel: { color: MUTED, marginTop: 4, fontWeight: '600' },
  empty: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: { color: MUTED },
  resCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  resLeft: { width: 76 },
  resDate: { color: '#C7DDD2', fontWeight: '700', fontSize: 13 },
  resTime: { color: GREEN, fontWeight: '900', fontSize: 21, marginTop: 3 },
  resMiddle: { flex: 1, paddingHorizontal: 8 },
  resName: { color: WHITE, fontWeight: '800', fontSize: 17 },
  resSub: { color: MUTED, marginTop: 4, fontSize: 12 },
  resBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  badgeOk: { backgroundColor: '#1D6A3D' },
  badgePending: { backgroundColor: '#63551C' },
  resBadgeText: { color: '#D8FDE8', fontWeight: '800', fontSize: 12 },
});
