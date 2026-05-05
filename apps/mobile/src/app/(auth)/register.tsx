import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { AuthBackground } from '@/components/AuthBackground';
import { toast } from '@/lib/toast';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function RegisterScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');

  async function handleRegister() {
    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }
    if (!password) {
      setError(tValidation('passwordRequired'));
      return;
    }
    if (password.length < 8) {
      setError(tValidation('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(tValidation('passwordsDoNotMatch'));
      return;
    }
    if (!consent) {
      setError(tValidation('consentRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.register(email.trim(), password);
      setSent(true);
    } catch {
      setError(tAuth('error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    await authApi.resendVerificationEmail(email.trim());
    setResending(false);
    toast.success(tAuth('resendVerificationSuccess'));
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setError(tAuth('otpLabel'));
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(tAuth('otpInvalid'));
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      // OTP verified successfully
      router.replace('/(auth)/login?verified=true');
    } catch (err) {
      const message = err instanceof Error ? err.message : tAuth('error');
      if (message.includes('Invalid') || message.includes('invalid')) {
        setError(tAuth('otpInvalid'));
      } else if (message.includes('expired')) {
        setError(tAuth('otpExpired'));
      } else {
        setError(message);
      }
    } finally {
      setVerifying(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.glowDecoration} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardWrapper}>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>{tCommon('appName')}</Text>
              <Text style={styles.title}>{tAuth('verifyEmailTitle')}</Text>
              <Text style={styles.subtitle}>
                {tAuth('verifyEmailDescription', { email: email.trim() })}
              </Text>

              {/* OTP Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tAuth('otpLabel')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={tAuth('otpPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!verifying}
                  autoFocus
                />
              </View>

              {/* Error banner */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              {/* Verify button */}
              <TouchableOpacity
                style={[styles.button, verifying && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={verifying}
              >
                <Text style={styles.buttonText}>
                  {verifying ? tAuth('verifying') : tAuth('verifyButton')}
                </Text>
              </TouchableOpacity>

              {/* Resend button */}
              <TouchableOpacity
                style={[styles.secondaryButton, resending && styles.buttonDisabled]}
                onPress={handleResend}
                disabled={resending}
              >
                <Text style={styles.secondaryButtonText}>
                  {resending ? tAuth('sending') : tAuth('resendVerification')}
                </Text>
              </TouchableOpacity>

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            {/* Eyebrow */}
            <Text style={styles.eyebrow}>{tCommon('appName')}</Text>

            {/* Card header */}
            <Text style={styles.title}>{tAuth('registerTitle')}</Text>
            <Text style={styles.subtitle}>{tAuth('registerDescription')}</Text>

            {/* Form fields */}
            <View style={styles.fieldsContainer}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tAuth('email')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={tAuth('emailPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tAuth('password')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={tAuth('passwordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {/* Confirm password */}
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

            {/* Consent checkbox */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsent((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                {consent && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                {tAuth('consentPrefix')}{' '}
                <Text
                  style={styles.consentLink}
                  onPress={() => void Linking.openURL(`${API_URL}/privacy?lang=${getLocale()}`)}
                >
                  {tAuth('consentPrivacy')}
                </Text>{' '}
                {tAuth('consentAnd')}{' '}
                <Text
                  style={styles.consentLink}
                  onPress={() => void Linking.openURL(`${API_URL}/terms?lang=${getLocale()}`)}
                >
                  {tAuth('consentTerms')}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>{tAuth('signingUp')}</Text>
              ) : (
                <Text style={styles.buttonText}>{tAuth('signUp')}</Text>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{tAuth('haveAccount')} </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerRowLink}>{tAuth('signInLink')}</Text>
              </TouchableOpacity>
            </View>
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
    consentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: colors.primaryForeground,
      fontSize: 12,
      fontWeight: '700',
    },
    consentText: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    consentLink: {
      color: colors.primary,
      fontWeight: '500',
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
      marginBottom: 20,
    },
    successBannerText: {
      fontSize: 13,
      color: colors.success,
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
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    secondaryButtonText: {
      color: colors.primary,
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
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 14,
    },
    footerText: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    footerRowLink: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
    },
    glowDecoration: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primary,
      opacity: 0.06,
    },
  });
}
