import { useState, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { feedbackApi } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';

type FormState = 'idle' | 'submitting' | 'success';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const t = useTranslations('feedback');
  const [formState, setFormState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  function handleClose() {
    if (formState === 'submitting') return;
    onClose();
    // reset after close animation
    setTimeout(() => {
      setMessage('');
      setError(null);
      if (formState === 'success') setFormState('idle');
    }, 300);
  }

  async function handleSubmit() {
    const text = message.trim();
    if (text.length < 5) {
      setError(t('minLength'));
      return;
    }
    setError(null);
    setFormState('submitting');
    try {
      await feedbackApi.submitFeedback(text);
      setFormState('success');
      setTimeout(() => {
        handleClose();
        setFormState('idle');
      }, 2500);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        setError(t('rateLimit'));
      } else {
        setError(t('errorFallback'));
      }
      setFormState('idle');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          {formState === 'success' ? (
            <View style={styles.successState}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={28} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>{t('success')}</Text>
              <Text style={styles.successDetail}>{t('successDetail')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>{t('title')}</Text>
                  <Text style={styles.subtitle}>{t('subtitle')}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={8}
                  disabled={formState === 'submitting'}
                >
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <TextInput
                ref={inputRef}
                style={styles.textarea}
                value={message}
                onChangeText={(v) => {
                  setMessage(v);
                  setError(null);
                }}
                placeholder={t('placeholder')}
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={5}
                maxLength={2000}
                editable={formState !== 'submitting'}
                textAlignVertical="top"
                autoFocus
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.footer}>
                <Text style={styles.charCount}>
                  {message.length > 0 ? `${message.length}/2000` : ''}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (formState === 'submitting' || message.trim().length < 5) &&
                      styles.submitDisabled,
                  ]}
                  onPress={() => void handleSubmit()}
                  disabled={formState === 'submitting' || message.trim().length < 5}
                  activeOpacity={0.8}
                >
                  {formState === 'submitting' ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color={colors.primaryForeground} />
                      <Text style={styles.submitText}>{t('submit')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 15, fontWeight: '600', color: colors.foreground },
    subtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    textarea: {
      margin: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      fontSize: 14,
      color: colors.foreground,
      minHeight: 120,
      lineHeight: 20,
    },
    errorText: {
      fontSize: 12,
      color: colors.destructive,
      marginHorizontal: 16,
      marginTop: -8,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginTop: 4,
    },
    charCount: { fontSize: 11, color: colors.mutedForeground },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
      minWidth: 90,
      justifyContent: 'center',
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { fontSize: 13, fontWeight: '600', color: colors.primaryForeground },

    // Success state
    successState: {
      alignItems: 'center',
      padding: 40,
      gap: 12,
    },
    successIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
    successDetail: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
  });
}
