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
import { router } from 'expo-router';
import { authApi } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { AuthActionButton } from '@/components/AuthActionButton';
import { AuthBackground } from '@/components/AuthBackground';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { toast } from '@/lib/toast';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');
  const tCommon = useTranslations('common');

  async function handleSendReset() {
    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset(email.trim());
      setStep('otp');
    } catch {
      setError(tAuth('error'));
    } finally {
      setLoading(false);
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

    setLoading(true);
    setError(null);

    try {
      const { resetToken: token } = await authApi.verifyPasswordResetOtp(email.trim(), otp.trim());
      setResetToken(token);
      setStep('password');
      setError(null);
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
      setLoading(false);
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword) {
      setError(tValidation('passwordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setError(tValidation('passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tValidation('passwordsDoNotMatch'));
      return;
    }
    if (!resetToken) {
      setError(tAuth('error'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.updatePassword(resetToken, newPassword);
      router.replace('/(auth)/login?reset=success');
    } catch (err) {
      const message = err instanceof Error ? err.message : tAuth('error');
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    setError(null);

    try {
      await authApi.requestPasswordReset(email.trim());
      setOtp('');
      toast.success(tAuth('resendVerificationSuccess'));
    } catch {
      setError(tAuth('error'));
    } finally {
      setResending(false);
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
            {step === 'email' && (
              <>
                <Text style={styles.title}>{tAuth('forgotPasswordTitle')}</Text>
                <Text style={styles.subtitle}>{tAuth('forgotPasswordDescription')}</Text>

                {/* Email field */}
                <View style={styles.fieldsContainer}>
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
                </View>

                {/* Error banner */}
                {error ? <InlineErrorBanner message={error} /> : null}

                {/* Submit */}
                <AuthActionButton
                  label={tAuth('sendResetCode')}
                  loading={loading}
                  loadingMode="spinner"
                  onPress={handleSendReset}
                />
              </>
            )}

            {step === 'otp' && (
              <>
                <Text style={styles.title}>{tAuth('verifyEmailTitle')}</Text>
                <Text style={styles.subtitle}>{tAuth('resetPasswordOtpDescription')}</Text>

                {/* OTP field */}
                <View style={styles.fieldsContainer}>
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
                      editable={!loading}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Error banner */}
                {error ? <InlineErrorBanner message={error} /> : null}

                {/* Verify button */}
                <AuthActionButton
                  label={tAuth('verifyButton')}
                  loading={loading}
                  loadingMode="spinner"
                  onPress={handleVerifyOtp}
                />

                {/* Resend button */}
                <AuthActionButton
                  label={tAuth('resendCode')}
                  variant="secondary"
                  loading={resending}
                  loadingLabel={tAuth('sending')}
                  onPress={handleResendOtp}
                />
              </>
            )}

            {step === 'password' && (
              <>
                <Text style={styles.title}>{tAuth('setNewPassword')}</Text>
                <Text style={styles.subtitle}>{tAuth('setPasswordDescription')}</Text>

                {/* Password fields */}
                <View style={styles.fieldsContainer}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{tAuth('newPassword')}</Text>
                    <TextInput
                      style={[styles.input, error ? styles.inputError : null]}
                      placeholder={tAuth('passwordPlaceholder')}
                      placeholderTextColor={colors.placeholder}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{tAuth('confirmPassword')}</Text>
                    <TextInput
                      style={[styles.input, error ? styles.inputError : null]}
                      placeholder={tAuth('passwordPlaceholder')}
                      placeholderTextColor={colors.placeholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Error banner */}
                {error ? <InlineErrorBanner message={error} /> : null}

                {/* Update button */}
                <AuthActionButton
                  label={tAuth('updatePassword')}
                  loading={loading}
                  loadingMode="spinner"
                  onPress={handleUpdatePassword}
                />
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
