// src/screens/FixtureChatScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../services/supabase';
import {
  getFixtureMessages,
  sendFixtureMessage,
  subscribeToFixtureMessages,
} from '../services/chatService';

const DARK = '#06120C';
const CARD = '#10231A';
const BLUE = '#2BE67B';
const BORDER = '#1A3628';

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function FixtureChatScreen({ navigation, route }) {
  const fixtureId = route?.params?.fixtureId;
  const fixtureTitle = route?.params?.fixtureTitle || 'Chat du match';

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data } = await getFixtureMessages(fixtureId);
      setMessages(data || []);
      setLoading(false);
    };

    init();
  }, [fixtureId]);

  useEffect(() => {
    if (!fixtureId) {
      return undefined;
    }

    const unsubscribe = subscribeToFixtureMessages(fixtureId, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    });

    return unsubscribe;
  }, [fixtureId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages]
  );

  const handleSend = async () => {
    if (!userId || !draft.trim() || sending) {
      return;
    }

    setSending(true);
    const { data, error } = await sendFixtureMessage({
      fixtureId,
      userId,
      message: draft,
    });
    setSending(false);

    if (!error && data) {
      setDraft('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) {
          return prev;
        }
        return [...prev, data];
      });
    }
  };

  const renderMessage = ({ item }) => {
    const mine = item.user_id === userId;
    const username = item.profiles?.username || item.profiles?.full_name || 'Joueur';
    return (
      <View style={[styles.messageWrap, mine ? styles.messageMine : styles.messageOther]}>
        <Text style={styles.messageAuthor}>{mine ? 'Vous' : username}</Text>
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={DARK} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{fixtureTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={BLUE} />
      ) : (
        <>
          <FlatList
            data={sortedMessages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun message. Lancez la discussion.</Text>
            }
          />

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ecrire un message..."
              placeholderTextColor="#6B7B8D"
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              <Text style={styles.sendBtnText}>{sending ? '...' : 'Envoyer'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  title: { flex: 1, marginHorizontal: 10, fontSize: 16, fontWeight: '800', color: '#FFF' },
  headerSpacer: { width: 40 },
  loader: { marginTop: 50 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyText: { color: '#6B7B8D', textAlign: 'center', marginTop: 80 },
  messageWrap: {
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  messageMine: { alignSelf: 'flex-end', backgroundColor: '#123A7A' },
  messageOther: { alignSelf: 'flex-start', backgroundColor: CARD },
  messageAuthor: { color: '#8AACCC', fontSize: 11, marginBottom: 4, fontWeight: '700' },
  messageText: { color: '#FFF', fontSize: 14 },
  messageTime: { color: '#6B7B8D', fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },
  composer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: CARD,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
    color: '#FFF',
    backgroundColor: DARK,
  },
  sendBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
