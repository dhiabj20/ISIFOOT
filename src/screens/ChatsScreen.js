// src/screens/ChatsScreen.js
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

const DARK = '#06120C';
const CARD = '#10231A';
const BORDER = '#1A3628';
const GREEN = '#2BE67B';
const MUTED = '#8AA59A';

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
    if (!target) {
      return;
    }
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
      <Text style={styles.openText}>Open chat</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={DARK} />
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.sub}>Discuss with teammates in your public fixtures</Text>
      </View>

      <FlatList
        data={fixtures}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No public fixture chats yet</Text>
            <Text style={styles.emptySub}>Create or join a public fixture to start chatting.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  sub: { color: MUTED, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  meta: { color: MUTED, marginTop: 8 },
  openText: { color: GREEN, marginTop: 12, fontWeight: '700' },
  badge: {
    backgroundColor: '#1B4D34',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: GREEN, fontWeight: '700', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { color: '#D2E8DA', fontWeight: '700', fontSize: 16 },
  emptySub: { color: MUTED, marginTop: 8, textAlign: 'center' },
});
