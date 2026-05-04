import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getFixtures, joinFixture, leaveFixture } from '../services/fixtureService';
import { COLORS } from '../theme';
import { GlassBackground, ScreenHeader, EmptyState } from '../components';

export default function FixturesScreen({ navigation }) {
  const [fixtures, setFixtures] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
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
    if (!userId) return;
    const players = getPlayersInTeam(fixture, team);
    const max = team === 'A' ? fixture.team_a_max : fixture.team_b_max;

    if (players.length >= max) {
      Alert.alert('Équipe complète', `L'équipe ${team === 'A' ? fixture.team_a_name : fixture.team_b_name} est complète.`);
      return;
    }

    setJoining(fixture.id + team);
    const { error } = await joinFixture({ fixtureId: fixture.id, userId, team });
    setJoining(null);

    if (error) Alert.alert('Erreur', error.message);
    else onRefresh();
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
                {players[i].profiles?.username || 'Joueur'}
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
              ? <ActivityIndicator color={COLORS.green} size="small" />
              : <Text style={styles.joinBtnText}>{isFull ? 'Complet' : 'Rejoindre'}</Text>
            }
          </TouchableOpacity>
        )}
        {isJoinedThisTeam && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>Vous êtes dans cette équipe</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFixture = ({ item: f }) => {
    const joined = isJoined(f);
    const myTeam = getMyTeam(f);
    const statusColor = f.status === 'open' ? COLORS.green : f.status === 'full' ? COLORS.orange : COLORS.textSecondary;

    return (
      <View style={styles.fixtureCard}>
        <View style={styles.fixtureHeader}>
          <Text style={styles.fixtureDate}>
            {new Date(f.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            {'  '}{f.start_time?.slice(0, 5)} – {f.end_time?.slice(0, 5)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor === COLORS.green ? COLORS.greenDim : statusColor === COLORS.orange ? COLORS.yellowDim : COLORS.bgCardAlt, borderColor: statusColor + '44' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {f.status === 'open' ? 'Ouvert' : f.status === 'full' ? 'Complet' : 'Terminé'}
            </Text>
          </View>
        </View>

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
                Ouvrir le chat de groupe ({myTeam ? `Équipe ${myTeam}` : 'participant'})
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader title="Matchs" navigation={navigation} />

      {loading ? (
        <ActivityIndicator color={COLORS.green} size="large" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(f) => f.id}
          renderItem={renderFixture}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
          ListEmptyComponent={<EmptyState title="Aucun match à venir" subtitle="Réservez le terrain pour créer un match !" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingIndicator: { marginTop: 60 },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  fixtureCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    padding: 16,
    marginBottom: 14,
  },
  fixtureHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  fixtureDate: { color: COLORS.fieldLabel, fontSize: 12, fontWeight: '600' },
  statusPill: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  teamsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  teamCol: { flex: 1, alignItems: 'center' },
  teamName: { color: COLORS.white, fontWeight: '800', fontSize: 14, marginBottom: 4, textAlign: 'center' },
  teamCount: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8 },
  playerSlot: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
  },
  playerName: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  playerEmpty: { color: COLORS.textTertiary, fontSize: 11, fontStyle: 'italic' },
  joinBtn: {
    marginTop: 8,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  joinBtnDisabled: {
    backgroundColor: COLORS.bgCardAlt,
    borderColor: COLORS.textTertiary,
  },
  joinBtnText: { color: COLORS.green, fontWeight: '800', fontSize: 12 },
  joinedBadge: {
    marginTop: 8,
    backgroundColor: COLORS.greenDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    padding: 6,
    width: '100%',
    alignItems: 'center',
  },
  joinedText: { color: COLORS.green, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  vsCenter: { paddingHorizontal: 8, paddingTop: 24 },
  vsText: { color: COLORS.orange, fontWeight: '900', fontSize: 16 },

  leaveBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.redDim,
  },
  leaveBtnText: { color: COLORS.red, fontWeight: '700', fontSize: 13 },
  chatBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt,
  },
  chatBtnText: { color: COLORS.fieldLabel, fontWeight: '700', fontSize: 13 },
});
