// src/screens/FixturesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getFixtures, joinFixture, leaveFixture } from '../services/fixtureService';

const DARK = '#06120C';
const CARD = '#10231A';
const BLUE = '#2BE67B';
const GREEN = '#2BE67B';
const ORANGE = '#96FF67';
const BORDER = '#1A3628';

export default function FixturesScreen({ navigation }) {
  const [fixtures, setFixtures] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {setUserId(user.id);}
    });
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await getFixtures();
    setFixtures(data || []);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { data } = await getFixtures();
    setFixtures(data || []);
    setRefreshing(false);
  }, []);

  const getPlayersInTeam = (fixture, team) =>
    (fixture.fixture_players || []).filter((p) => p.team === team);

  const isJoined = (fixture) =>
    (fixture.fixture_players || []).some((p) => p.user_id === userId);

  const getMyTeam = (fixture) => {
    const me = (fixture.fixture_players || []).find((p) => p.user_id === userId);
    return me?.team || null;
  };

  const handleJoin = async (fixture, team) => {
    if (!userId) {return;}
    const players = getPlayersInTeam(fixture, team);
    const max = team === 'A' ? fixture.team_a_max : fixture.team_b_max;

    if (players.length >= max) {
      Alert.alert('Équipe complète', `L'équipe ${team === 'A' ? fixture.team_a_name : fixture.team_b_name} est complète.`);
      return;
    }

    setJoining(fixture.id + team);
    const { error } = await joinFixture({ fixtureId: fixture.id, userId, team });
    setJoining(null);

    if (error) {Alert.alert('Erreur', error.message);}
    else {onRefresh();}
  };

  const handleLeave = async (fixture) => {
    Alert.alert('Quitter le match ?', 'Votre place sera libérée.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', onPress: async () => {
          await leaveFixture({ fixtureId: fixture.id, userId });
          onRefresh();
        },
      },
    ]);
  };

  const renderTeamCol = (fixture, team) => {
    const name = team === 'A' ? fixture.team_a_name : fixture.team_b_name;
    const max = team === 'A' ? fixture.team_a_max : fixture.team_b_max;
    const players = getPlayersInTeam(fixture, team);
    const joined = isJoined(fixture);
    const myTeam = getMyTeam(fixture);
    const isFull = players.length >= max;
    const isJoinedThisTeam = myTeam === team;

    return (
      <View style={styles.teamCol}>
        <Text style={styles.teamName}>{name}</Text>
        <Text style={styles.teamCount}>
          {players.length}/{max} joueurs
        </Text>
        {Array.from({ length: max }).map((_, i) => (
          <View key={i} style={styles.playerSlot}>
            {players[i] ? (
              <Text style={styles.playerName}>
                👤 {players[i].profiles?.username || 'Joueur'}
              </Text>
            ) : (
              <Text style={styles.playerEmpty}>— Libre —</Text>
            )}
          </View>
        ))}
        {fixture.status === 'open' && !isJoinedThisTeam && !joined && (
          <TouchableOpacity
            style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
            onPress={() => handleJoin(fixture, team)}
            disabled={isFull || joining === fixture.id + team}
          >
            {joining === fixture.id + team
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.joinBtnText}>{isFull ? 'Complet' : 'Rejoindre'}</Text>
            }
          </TouchableOpacity>
        )}
        {isJoinedThisTeam && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>✅ Vous êtes dans cette équipe</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFixture = ({ item: f }) => {
    const joined = isJoined(f);
    const myTeam = getMyTeam(f);
    const statusColor = f.status === 'open' ? GREEN : f.status === 'full' ? ORANGE : '#5A7A9A';

    return (
      <View style={styles.fixtureCard}>
        {/* Date / Status row */}
        <View style={styles.fixtureHeader}>
          <Text style={styles.fixtureDate}>
            📅 {new Date(f.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            {'  '}🕐 {f.start_time?.slice(0, 5)} – {f.end_time?.slice(0, 5)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {f.status === 'open' ? '🟢 Ouvert' : f.status === 'full' ? '🟠 Complet' : '⚫ Terminé'}
            </Text>
          </View>
        </View>

        {/* Teams */}
        <View style={styles.teamsRow}>
          {renderTeamCol(f, 'A')}
          <View style={styles.vsCenter}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {renderTeamCol(f, 'B')}
        </View>

        {joined && (
          <>
            <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('FixtureChat', {
              fixtureId: f.id,
              fixtureTitle: `${f.team_a_name} vs ${f.team_b_name}`,
            })}>
              <Text style={styles.chatBtnText}>
                Ouvrir le chat de groupe ({myTeam ? `Equipe ${myTeam}` : 'participant'})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.leaveBtn} onPress={() => handleLeave(f)}>
              <Text style={styles.leaveBtnText}>Quitter ce match</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚽ Fixtures</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(f) => f.id}
          renderItem={renderFixture}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun match à venir pour le moment.</Text>
              <Text style={styles.emptySub}>Réservez le terrain pour créer un match !</Text>
            </View>
          }
        />
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
  refreshBtn: { padding: 4 },
  refreshText: { color: BLUE, fontSize: 22, fontWeight: '300' },
  loadingIndicator: { marginTop: 60 },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  fixtureCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
  },
  fixtureHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  fixtureDate: { color: '#8AACCC', fontSize: 12, fontWeight: '600' },
  statusPill: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  teamsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  teamCol: { flex: 1, alignItems: 'center' },
  teamName: { color: '#FFF', fontWeight: '800', fontSize: 14, marginBottom: 4, textAlign: 'center' },
  teamCount: { color: '#5A7A9A', fontSize: 11, marginBottom: 8 },
  playerSlot: {
    backgroundColor: '#0A1628', borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4, width: '100%', alignItems: 'center',
  },
  playerName: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  playerEmpty: { color: '#2A3A55', fontSize: 11, fontStyle: 'italic' },
  joinBtn: {
    marginTop: 8, backgroundColor: BLUE, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, width: '100%', alignItems: 'center',
  },
  joinBtnDisabled: { backgroundColor: '#2A3A55' },
  joinBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  joinedBadge: { marginTop: 8, backgroundColor: GREEN + '22', borderRadius: 8, padding: 6, width: '100%', alignItems: 'center' },
  joinedText: { color: GREEN, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  vsCenter: { paddingHorizontal: 8, paddingTop: 24 },
  vsText: { color: ORANGE, fontWeight: '900', fontSize: 16 },

  leaveBtn: {
    marginTop: 12, borderWidth: 1, borderColor: '#FF4D4D',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  leaveBtnText: { color: '#FF4D4D', fontWeight: '700', fontSize: 13 },
  chatBtn: {
    marginTop: 12, borderWidth: 1, borderColor: BLUE,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#123A7A33',
  },
  chatBtnText: { color: '#BBD7FF', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#5A7A9A', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#2A3A55', fontSize: 13, marginTop: 8 },
});
