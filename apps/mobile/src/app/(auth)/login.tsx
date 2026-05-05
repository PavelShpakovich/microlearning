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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { authApi, profileApi } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { AuthActionButton } from '@/components/AuthActionButton';
import { AuthBackground } from '@/components/AuthBackground';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { useEffect } from 'react';
import { toast } from '@/lib/toast';

export default function LoginScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { verified, reset } = useLocalSearchParams<{ verified?: string; reset?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');

  useEffect(() => {
    if (verified === 'true') {
      toast.success(tAuth('emailVerified'));
    } else if (reset === 'success') {
      toast.success(tAuth('passwordUpdated'));
    }
  }, [verified, reset, tAuth]);

  async function handleLogin() {
    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }
    if (!password) {
      setError(tValidation('passwordRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    setShowResend(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      const message = signInError.message.toLowerCase();
      if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
        setError(tAuth('emailNotVerified'));
        setShowResend(true);
      } else if (signInError.status === 400) {
        setError(tAuth('invalidCredentials'));
      } else {
        setError(tAuth('error'));
      }
      return;
    }

    const profile = await profileApi.getProfile(true);
    if (!profile.onboarding_completed_at) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }

    try {
      setResending(true);
      await authApi.resendVerificationEmail(email.trim());
      setError(null);
      setOtp('');
      // Stay on same screen, OTP will be sent
    } catch {
      setError(tAuth('error'));
    } finally {
      setResending(false);
    }
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
      setShowResend(false);
      setOtp('');
      setError(null);
      // Now try logging in with the verified email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(tAuth('error'));
        return;
      }

      const profile = await profileApi.getProfile(true);
      if (!profile.onboarding_completed_at) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
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
            <Text style={styles.title}>{tAuth('loginTitle')}</Text>
            <Text style={styles.subtitle}>{tAuth('loginDescription')}</Text>

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
            </View>

            {/* Verification error banner */}
            {verified === 'error' ? (
              <InlineErrorBanner message={tAuth('emailVerificationError')} />
            ) : null}

            {/* Error banner */}
            {error ? <InlineErrorBanner message={error} /> : null}

            {/* Submit */}
            <AuthActionButton
              label={tAuth('signIn')}
              loading={loading}
              loadingLabel={tAuth('signingIn')}
              onPress={handleLogin}
            />

            {showResend ? (
              <>
                {/* OTP Input Section */}
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

                {/* Verify OTP button */}
                <AuthActionButton
                  label={tAuth('verifyButton')}
                  loading={verifying}
                  loadingLabel={tAuth('verifying')}
                  onPress={handleVerifyOtp}
                />

                {/* Resend OTP button */}
                <AuthActionButton
                  label={tAuth('resendVerification')}
                  variant="secondary"
                  loading={resending}
                  loadingLabel={tAuth('sending')}
                  onPress={handleResendVerification}
                />
              </>
            ) : null}

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.footerLinkContainer}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.footerLink}>{tAuth('forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{tAuth('noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerRowLink}>{tAuth('signUpLink')}</Text>
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
    successBanner: {
      backgroundColor: colors.successSubtle,
      borderColor: colors.success,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    successBannerText: {
      fontSize: 13,
      color: colors.success,
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
      marginTop: 10,
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
  });
}
