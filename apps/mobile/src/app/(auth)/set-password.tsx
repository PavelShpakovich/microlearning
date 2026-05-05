import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { authApi } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { AuthBackground } from '@/components/AuthBackground';

export default function SetPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');
  const tCommon = useTranslations('common');

  async function handleSetPassword() {
    if (!password || password.length < 8) {
      setError(tValidation('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(tValidation('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(tAuth('error'));
      return;
    }

    await supabase.auth.signOut({ scope: 'local' });

    setDone(true);
    setTimeout(() => router.replace('/(auth)/login?reset=success'), 1500);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Radial glow decoration */}
      <AuthBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            {/* Eyebrow */}
            <Text style={styles.eyebrow}>{tCommon('appName')}</Text>

            {/* Card header */}
            <Text style={styles.title}>{tAuth('setPasswordTitle')}</Text>
            <Text style={styles.subtitle}>{tAuth('setPasswordDescription')}</Text>

            {done ? (
              /* Success banner */
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{tAuth('passwordUpdated')}</Text>
              </View>
            ) : (
              <>
                {/* Password fields */}
                <View style={styles.fieldsContainer}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{tAuth('newPassword')}</Text>
                    <TextInput
                      style={[styles.input, error ? styles.inputError : null]}
                      placeholder={tAuth('newPassword')}
                      placeholderTextColor={colors.placeholder}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                      autoFocus
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{tAuth('confirmPassword')}</Text>
                    <TextInput
                      style={[styles.input, error ? styles.inputError : null]}
                      placeholder={tAuth('confirmPassword')}
                      placeholderTextColor={colors.placeholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Error banner */}
                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.buttonText}>{tAuth('setPassword')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Back to login */}
            <TouchableOpacity
              style={styles.footerLinkContainer}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.footerLink}>{tAuth('backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    cardWrapper: {
      width: '100%',
      maxWidth: 400,
      marginHorizontal: 20,
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 28,
      ...cardShadow,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    fieldsContainer: {
      gap: 14,
      marginBottom: 16,
    },
    fieldGroup: {
      gap: 0,
    },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: '500',
      marginBottom: 6,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: 'transparent',
    },
    inputError: {
      borderColor: colors.destructive,
    },
    errorBanner: {
      backgroundColor: colors.destructiveSubtle,
      borderColor: colors.destructive,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    errorBannerText: {
      fontSize: 13,
      color: colors.destructive,
    },
    successBanner: {
      backgroundColor: colors.successSubtle,
      borderColor: colors.success,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    successBannerText: {
      fontSize: 13,
      color: colors.success,
      textAlign: 'center',
      fontWeight: '500',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    footerLinkContainer: {
      marginTop: 14,
      alignItems: 'center',
    },
    footerLink: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
