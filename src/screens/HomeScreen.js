import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getUserReservations } from '../services/reservationService';
import { getUserChatFixtures } from '../services/fixtureService';
import { useTheme } from '../context/ThemeContext';
import { GlassBackground, GlassPanel, StatCard } from '../components';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [myReservations, setMyReservations] = useState([]);
  const [myPublicFixtures, setMyPublicFixtures] = useState([]);
  const [joinedFixturesCount, setJoinedFixturesCount] = useState(0);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GlassBackground />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.hello}>Bonjour, {profile?.full_name?.split(' ')[0] || 'Etudiant'}</Text>
              <Text style={styles.sub}>GLSI2C - ISIMA Mahdia</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => goTab('Profile')}>
              <Text style={styles.avatarText}>
                {(profile?.full_name?.[0] || profile?.username?.[0] || 'E').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatCard value={stats.created} label="Reservations" />
            <StatCard value={stats.upcoming} label="A venir" />
            <StatCard value={stats.joinedOrCreated} label="Matchs" />
            <StatCard value={stats.thisMonth} label="Ce mois" />
          </View>

          <Text style={styles.sectionTitle}>PROCHAINES RESERVATIONS</Text>
          {upcomingReservations.length === 0 ? (
            <GlassPanel compact style={styles.empty}>
              <Text style={styles.emptyText}>Aucune reservation a venir.</Text>
            </GlassPanel>
          ) : (
            upcomingReservations.map((r) => (
              <GlassPanel compact key={r.id} style={styles.resCardWrap}>
                <TouchableOpacity
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
                      {r.visibility === 'public' ? 'Reservation publique' : 'Reservation privee'}
                    </Text>
                  </View>
                  <View style={[styles.resBadge, r.status === 'confirmed' ? styles.badgeOk : styles.badgePending]}>
                    <Text style={styles.resBadgeText}>
                      {r.status === 'confirmed' ? 'CONFIRMEE' : 'EN ATTENTE'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </GlassPanel>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hello: { color: colors.white, fontSize: 24, fontWeight: '900' },
    sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, letterSpacing: 0.2 },
    avatarBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.bgCard,
      borderWidth: 1.5,
      borderColor: colors.greenBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.green, fontWeight: '900', fontSize: 20 },
    sectionTitle: {
      color: colors.headerSub,
      letterSpacing: 2.2,
      fontWeight: '800',
      fontSize: 13,
      marginTop: 24,
      marginBottom: 12,
    },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
    empty: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { color: colors.textSecondary },
    resCardWrap: { marginBottom: 10 },
    resCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    resLeft: { width: 76 },
    resDate: { color: colors.whiteMuted, fontWeight: '700', fontSize: 13 },
    resTime: { color: colors.green, fontWeight: '900', fontSize: 21, marginTop: 3 },
    resMiddle: { flex: 1, paddingHorizontal: 8 },
    resName: { color: colors.white, fontWeight: '800', fontSize: 17 },
    resSub: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
    resBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
    badgeOk: { backgroundColor: colors.greenDim },
    badgePending: { backgroundColor: colors.yellowDim },
    resBadgeText: { color: colors.green, fontWeight: '800', fontSize: 11 },
  });
}
