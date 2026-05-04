import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { GlassBackground, ScreenHeader } from '../components';

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

function mergeMessages(previous, incoming) {
  const map = new Map();
  [...previous, ...(incoming || [])].forEach((message) => {
    if (message?.id) {
      map.set(message.id, message);
    }
  });
  return Array.from(map.values());
}

let tempIdCounter = 0;

export default function FixtureChatScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fixtureId = route?.params?.fixtureId;
  const fixtureTitle = route?.params?.fixtureTitle || 'Chat du match';

  const [userId, setUserId] = useState(null);
  const userIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || null;
      setUserId(uid);
      userIdRef.current = uid;

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

    const unsubscribe = subscribeToFixtureMessages(fixtureId, userIdRef.current, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    });

    return unsubscribe;
  }, [fixtureId]);

  useEffect(() => {
    if (!fixtureId) {
      return undefined;
    }

    const pollMessages = async () => {
      const { data } = await getFixtureMessages(fixtureId);
      setMessages((prev) => mergeMessages(prev, data));
    };

    pollingRef.current = setInterval(pollMessages, 4000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fixtureId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages]
  );

  const scrollToBottom = () => {
    if (flatListRef.current && sortedMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (!userId || !draft.trim() || sending) {
      return;
    }

    const trimmed = draft.trim();
    setDraft('');
    setSending(true);

    const tempId = `temp-${Date.now()}-${tempIdCounter++}`;
    const optimisticMsg = {
      id: tempId,
      message: trimmed,
      created_at: new Date().toISOString(),
      user_id: userId,
      profiles: null,
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    const { data, error } = await sendFixtureMessage({
      fixtureId,
      userId,
      message: trimmed,
    });
    setSending(false);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    if (data) {
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === tempId ? { ...data, _optimistic: false } : m));
        return mergeMessages([], replaced);
      });
    }
  };

  const renderMessage = ({ item }) => {
    const mine = item.user_id === userId;
    const username = item.profiles?.username || item.profiles?.full_name || 'Joueur';
    return (
      <View style={[styles.messageWrap, mine ? styles.messageMine : styles.messageOther]}>
        <Text style={styles.messageAuthor}>{mine ? 'Vous' : username}</Text>
        <Text style={[styles.messageText, item._optimistic && styles.messageOptimistic]}>{item.message}</Text>
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <GlassBackground />
      <ScreenHeader title={fixtureTitle} navigation={navigation} />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={sortedMessages}
            keyExtractor={(m) => String(m.id)}
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
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
              onSubmitEditing={handleSend}
              returnKeyType="send"
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

function createStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    loader: { marginTop: 50 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    emptyText: { color: colors.placeholder, textAlign: 'center', marginTop: 80 },
    messageWrap: {
      maxWidth: '85%',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.greenBorder,
    },
    messageMine: {
      alignSelf: 'flex-end',
      backgroundColor: colors.greenDim,
      borderColor: colors.greenBorderActive,
    },
    messageOther: {
      alignSelf: 'flex-start',
      backgroundColor: colors.bgCard,
    },
    messageAuthor: { color: colors.fieldLabel, fontSize: 11, marginBottom: 4, fontWeight: '700' },
    messageText: { color: colors.white, fontSize: 14 },
    messageOptimistic: { opacity: 0.5 },
    messageTime: { color: colors.placeholder, fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },
    composer: {
      borderTopWidth: 1,
      borderTopColor: colors.greenBorder,
      backgroundColor: colors.composerBg,
      padding: 10,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.greenBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      maxHeight: 100,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    sendBtn: {
      backgroundColor: colors.greenDim,
      borderWidth: 1,
      borderColor: colors.green,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  });
}
