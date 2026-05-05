import { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { goBackTo, routes } from '@/lib/navigation';
import { MarkdownText } from '@/components/MarkdownText';
import { Skeleton } from '@/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { chatApi, ApiClientError } from '@clario/api-client';
import type { UnlockFollowUpResponse } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { allMessages } from '@clario/i18n';
import { useColors } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { runToastMutation } from '@/lib/mutation-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInsufficientCredits } from '@/lib/insufficient-credits-context';
import { useCreditSpendConfirm } from '@/hooks/useCreditSpendConfirm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGES_FALLBACK = 5;

export default function ChatScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { readingId, returnTo } = useLocalSearchParams<{ readingId: string; returnTo?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [messagesLimit, setMessagesLimit] = useState(MAX_MESSAGES_FALLBACK);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const chatStarters =
    (allMessages[getLocale()].chat.starters as Record<string, Record<string, string>>).default ??
    {};

  const tChat = useTranslations('chat');
  const { showInsufficientCredits } = useInsufficientCredits();
  const { confirmSpend: confirmFollowUpSpend } = useCreditSpendConfirm('follow_up_pack');

  const limitReached = messagesUsed >= messagesLimit;

  // Load existing thread on mount to get real limit + history
  useEffect(() => {
    if (!readingId) return;
    void (async () => {
      try {
        const thread = await chatApi.getThread(readingId);
        setMessagesLimit(thread.messagesLimit);
        setMessagesUsed(thread.messagesUsed);
        setMessages(
          thread.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        );
      } catch {
        // fallback — start fresh with default limit
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      abortRef.current?.abort();
    };
  }, [readingId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming || limitReached) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setMessagesUsed((n) => n + 1);
    setInput('');
    setStreaming(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    abortRef.current = new AbortController();

    try {
      await chatApi.streamAssistantReply({
        readingId,
        message: text,
        signal: abortRef.current.signal,
        onChunk: (accumulated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          );
          listRef.current?.scrollToEnd({ animated: true });
        },
      });
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'));
      if (!isAbort) {
        // Revert optimistic count on failure
        setMessagesUsed((n) => Math.max(0, n - 1));
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        toast.error(tChat('errorSending'));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await runToastMutation<UnlockFollowUpResponse>({
        action: () => chatApi.unlockFollowUp(readingId),
        mapSuccessMessage: (result) =>
          tChat('unlockSuccess').replace('{count}', String(result.addedMessages)),
        errorMessage: tChat('unlockFailed'),
        mapErrorMessage: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            return undefined;
          }

          return tChat('unlockFailed');
        },
        onSuccess: (result) => {
          setMessagesLimit(result.messagesLimit);
        },
        onError: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            const data = error.data as { required?: number; balance?: number } | undefined;
            showInsufficientCredits({ required: data?.required, balance: data?.balance });
          }
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setUnlocking(false);
    }
  }

  function handleUnlockPress() {
    if (unlocking) return;

    void (async () => {
      const ok = await confirmFollowUpSpend();
      if (!ok) return;
      await handleUnlock();
    })();
  }

  function handleStarterQuestion(q: string) {
    setInput(q);
  }

  const starterQuestions = [
    chatStarters.q0 ?? '',
    chatStarters.q1 ?? '',
    chatStarters.q2 ?? '',
  ].filter(Boolean);

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header skeleton */}
        <View style={[styles.header, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
          <Skeleton width={120} height={16} borderRadius={8} />
          <Skeleton width={64} height={22} borderRadius={12} />
        </View>
        {/* Message bubbles skeleton */}
        <View style={styles.skeletonMessages}>
          <View style={styles.skeletonRowRight}>
            <Skeleton width={200} height={52} borderRadius={12} />
          </View>
          <View style={styles.skeletonRowLeft}>
            <Skeleton width={260} height={80} borderRadius={12} />
          </View>
          <View style={styles.skeletonRowRight}>
            <Skeleton width={160} height={38} borderRadius={12} />
          </View>
          <View style={styles.skeletonRowLeft}>
            <Skeleton width={240} height={96} borderRadius={12} />
          </View>
        </View>
        {/* Input skeleton */}
        <View style={styles.skeletonInputRow}>
          <Skeleton height={44} borderRadius={20} style={{ flex: 1 }} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, routes.tabs.readings)}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tChat('backToReading')}</Text>
        </TouchableOpacity>
        <View style={styles.limitChip}>
          <Text style={styles.limitChipText}>
            {tChat('limitHint')
              .replace('{used}', String(messagesUsed))
              .replace('{max}', String(messagesLimit))}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{tChat('whereToStart')}</Text>
            {starterQuestions.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={styles.starterButton}
                onPress={() => handleStarterQuestion(q)}
              >
                <Text style={styles.starterText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageRole,
                item.role === 'user' ? styles.messageRoleUser : styles.messageRoleAssistant,
              ]}
            >
              {item.role === 'user' ? tChat('you') : tChat('assistant')}
            </Text>
            {item.role === 'user' ? (
              <Text style={styles.userText}>{item.content}</Text>
            ) : (
              <MarkdownText>{item.content || (streaming ? '…' : '')}</MarkdownText>
            )}
          </View>
        )}
      />

      {/* Limit reached / unlock */}
      {limitReached && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>{tChat('limitReached')}</Text>
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={handleUnlockPress}
            disabled={unlocking}
          >
            {unlocking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.unlockButtonText}>
                {tChat('unlockMore').replace('{count}', '5')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      {!limitReached && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={tChat('askPlaceholder')}
            placeholderTextColor={colors.placeholder}
            multiline
            editable={!streaming}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          {streaming ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleStop}>
              <Ionicons name="stop-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={input.trim() ? colors.primary : colors.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
    limitChip: {
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    limitChipText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    messagesList: {
      padding: 16,
      gap: 12,
      flexGrow: 1,
    },
    emptyState: {
      gap: 10,
      paddingTop: 24,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    starterButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
    },
    starterText: {
      fontSize: 14,
      color: colors.foreground,
    },
    messageBubble: {
      maxWidth: '85%',
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: colors.muted,
    },
    messageRole: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    messageRoleUser: {
      color: 'rgba(255,255,255,0.6)',
    },
    messageRoleAssistant: {
      color: colors.mutedForeground,
    },
    userText: {
      fontSize: 15,
      color: '#fff',
      lineHeight: 22,
    },
    limitBanner: {
      margin: 16,
      backgroundColor: '#fef3c7',
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    limitBannerText: {
      fontSize: 14,
      color: '#92400e',
      textAlign: 'center',
    },
    unlockButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    unlockButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendDisabled: {
      opacity: 0.4,
    },
    skeletonMessages: {
      flex: 1,
      padding: 16,
      gap: 16,
    },
    skeletonRowRight: {
      alignItems: 'flex-end',
    },
    skeletonRowLeft: {
      alignItems: 'flex-start',
    },
    skeletonInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}
