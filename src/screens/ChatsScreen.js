import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getUserChatFixtures } from '../services/fixtureService';
import { COLORS } from '../theme';
import { EmptyState, GlassBackground, GlassPanel } from '../components';

function formatDate(date, time) {
  try {
    const d = new Date(`${date}T${String(time).slice(0, 8)}`);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return date;
  }
}

export default function ChatsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [userId, setUserId] = useState(null);

  const load = useCallback(async (uid) => {
    const target = uid || userId;
    if (!target) return;
    const { data } = await getUserChatFixtures(target);
    setFixtures(data || []);
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await load(user.id);
      }
      setLoading(false);
    };
    init();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <GlassPanel compact style={styles.cardWrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('FixtureChat', {
          fixtureId: item.id,
          fixtureTitle: `${item.team_a_name} vs ${item.team_b_name}`,
        })}
        activeOpacity={0.85}
      >
        <View style={styles.row}>
          <Text style={styles.matchTitle}>{item.team_a_name} vs {item.team_b_name}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Chat</Text></View>
        </View>
        <Text style={styles.meta}>
          {formatDate(item.date, item.start_time)} - {item.start_time?.slice(0, 5)} to {item.end_time?.slice(0, 5)}
        </Text>
        <Text style={styles.openText}>Open group chat</Text>
      </TouchableOpacity>
    </GlassPanel>
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <GlassBackground />
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GlassBackground />

      <GlassPanel style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.sub}>Discuss with your teammates</Text>
      </GlassPanel>

      <FlatList
        data={fixtures}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        ListEmptyComponent={<EmptyState title="No group chats yet" subtitle="Join or create a public fixture to start chatting." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, marginHorizontal: 14, marginBottom: 8 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  sub: { color: COLORS.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 },
  cardWrap: { marginBottom: 12 },
  card: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTitle: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  meta: { color: COLORS.textSecondary, marginTop: 8 },
  openText: { color: COLORS.green, marginTop: 12, fontWeight: '700' },
  badge: {
    backgroundColor: COLORS.greenDim,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  badgeText: { color: COLORS.green, fontWeight: '700', fontSize: 11 },
});
