import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Send } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Message = {
  id: string;
  user: string;
  text: string;
  createdAt: number;
};

type PartyState = 'idle' | 'joining' | 'joined';

const WatchPartyScreen = () => {
  const { session } = useAuth();
  const [partyCode, setPartyCode] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partyState, setPartyState] = useState<PartyState>('idle');
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const userDisplayName = session?.email?.split('@')[0] || 'ضيف';

  const joinParty = async () => {
    if (!partyCode.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كود الحفلة');
      return;
    }
    setJoining(true);
    try {
      // Subscribe to Supabase Realtime channel for this party
      const channel = supabase.channel(`watch-party:${partyCode.trim()}`, {
        config: { broadcast: { self: true } },
      });

      channel
        .on('broadcast', { event: 'message' }, (payload: any) => {
          const msg = payload.payload as Message;
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setPartyState('joined');
            setJoining(false);
            // Send join notification
            channel.send({
              type: 'broadcast',
              event: 'message',
              payload: {
                id: `${Date.now()}-join`,
                user: 'النظام',
                text: `${userDisplayName} انضم إلى الحفلة`,
                createdAt: Date.now(),
              } as Message,
            });
          }
        });

      channelRef.current = channel;
    } catch (e: any) {
      Alert.alert('خطأ', 'تعذر الانضمام. تحقق من الكود وحاول مجدداً.');
      setJoining(false);
    }
  };

  const leaveParty = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setPartyState('idle');
    setMessages([]);
    setPartyCode('');
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelRef.current) return;
    setSending(true);
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      user: userDisplayName,
      text: newMessage.trim(),
      createdAt: Date.now(),
    };
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: msg,
    });
    setNewMessage('');
    setSending(false);
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.background}>
        <View style={styles.header}>
          <Users size={28} color="#fff" />
          <Text style={styles.title}>حفلة المشاهدة</Text>
          {partyState === 'joined' && (
            <TouchableOpacity onPress={leaveParty} style={styles.leaveButton}>
              <Text style={styles.leaveText}>مغادرة</Text>
            </TouchableOpacity>
          )}
        </View>

        {partyState === 'idle' && (
          <View style={styles.joinSection}>
            <Text style={styles.joinLabel}>أدخل كود الحفلة للانضمام</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="كود الحفلة"
                placeholderTextColor="#9ca3af"
                value={partyCode}
                onChangeText={setPartyCode}
                autoCapitalize="characters"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.joinButton}
                onPress={joinParty}
                disabled={joining}
                activeOpacity={0.85}
              >
                {joining ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.joinButtonText}>انضم</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.orText}>أو</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                const code = Math.random().toString(36).slice(2, 8).toUpperCase();
                setPartyCode(code);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.createButtonText}>إنشاء حفلة جديدة</Text>
            </TouchableOpacity>
          </View>
        )}

        {partyState === 'joined' && (
          <KeyboardAvoidingView
            style={styles.chatWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.partyCodeBadge}>
              <Text style={styles.partyCodeText}>كود الحفلة: {partyCode}</Text>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatContent}
              renderItem={({ item }) => {
                const isSystem = item.user === 'النظام';
                const isMe = item.user === userDisplayName;
                return (
                  <View style={[
                    styles.messageBubble,
                    isMe && styles.myBubble,
                    isSystem && styles.systemBubble,
                  ]}>
                    {!isMe && !isSystem && (
                      <Text style={styles.userLabel}>{item.user}</Text>
                    )}
                    <Text style={[styles.messageText, isSystem && styles.systemText]}>
                      {item.text}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyChat}>لا توجد رسائل بعد. ابدأ المحادثة!</Text>
              }
            />

            <View style={styles.chatInputRow}>
              <TouchableOpacity
                onPress={sendMessage}
                style={styles.sendButton}
                disabled={sending || !newMessage.trim()}
                activeOpacity={0.85}
              >
                <Send size={20} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                placeholder="اكتب رسالة..."
                placeholderTextColor="#6b7280"
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={sendMessage}
                textAlign="right"
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 24, gap: 10,
  },
  title: { fontSize: 22, color: '#fff', fontWeight: '800', flex: 1 },
  leaveButton: {
    backgroundColor: '#7f1d1d', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  leaveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  joinSection: { paddingHorizontal: 24 },
  joinLabel: {
    color: '#9ca3af', fontSize: 14, textAlign: 'right', marginBottom: 16,
  },
  joinRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  codeInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 10,
    color: '#fff', fontSize: 18, fontWeight: '800',
    paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#374151',
    letterSpacing: 4,
  },
  joinButton: {
    backgroundColor: '#00e5ff', borderRadius: 10,
    paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center',
    height: 52,
  },
  joinButtonText: { color: '#000', fontWeight: '800', fontSize: 15 },
  orText: { color: '#6b7280', textAlign: 'center', marginVertical: 12 },
  createButton: {
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  createButtonText: { color: '#fff', fontWeight: '700' },
  chatWrapper: { flex: 1, paddingHorizontal: 16 },
  partyCodeBadge: {
    backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)',
  },
  partyCodeText: { color: '#00e5ff', fontWeight: '700', fontSize: 13 },
  chatList: { flex: 1 },
  chatContent: { paddingBottom: 10 },
  messageBubble: {
    backgroundColor: '#1f2937', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8, maxWidth: '80%', alignSelf: 'flex-start',
  },
  myBubble: { backgroundColor: '#1d4ed8', alignSelf: 'flex-end' },
  systemBubble: {
    backgroundColor: 'transparent', alignSelf: 'center',
    maxWidth: '100%',
  },
  userLabel: { color: '#00e5ff', fontSize: 11, marginBottom: 3, fontWeight: '700' },
  messageText: { color: '#fff', fontSize: 14 },
  systemText: { color: '#6b7280', fontSize: 12, fontStyle: 'italic' },
  emptyChat: {
    color: '#6b7280', textAlign: 'center',
    marginTop: 40, fontSize: 14,
  },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1f2937',
  },
  chatInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 20,
    paddingHorizontal: 16, height: 44, color: '#fff', fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#e50914', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
  },
});

export default WatchPartyScreen;
