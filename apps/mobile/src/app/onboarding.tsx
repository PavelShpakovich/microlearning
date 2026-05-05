import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { profileApi, preferencesApi } from '@clario/api-client';
import { TONE_STYLES } from '@clario/types';
import { useTranslations } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOCUS_OPTIONS = ['love', 'career', 'growth', 'all'] as const;
type FocusOption = (typeof FOCUS_OPTIONS)[number];

export default function OnboardingScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [focus, setFocus] = useState<FocusOption | null>(null);
  const [toneStyle, setToneStyle] = useState<string | null>(null);
  const [allowSpiritualTone, setAllowSpiritualTone] = useState(false);
  const [saving, setSaving] = useState(false);

  const t = useTranslations('onboarding');
  const tSettings = useTranslations('settingsPage');
  const tNav = useTranslations('navigation');

  async function handleFinish() {
    setSaving(true);
    try {
      await preferencesApi.updatePreferences({
        toneStyle: toneStyle ?? 'balanced',
        contentFocusLove: focus === 'love' || focus === 'all' || focus === null,
        contentFocusCareer: focus === 'career' || focus === 'all' || focus === null,
        contentFocusGrowth: focus === 'growth' || focus === 'all' || focus === null,
        allowSpiritualTone,
      });
      await profileApi.updateProfile({ onboardingCompleted: true });
      router.replace('/(tabs)');
    } catch {
      // If saving fails, still proceed so user isn't blocked
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await profileApi.updateProfile({ onboardingCompleted: true });
    } finally {
      setSaving(false);
      router.replace('/(tabs)');
    }
  }

  const toneLabels: Record<string, string> = {
    balanced: tSettings('toneBalanced'),
    mystical: tSettings('toneMystical'),
    therapeutic: tSettings('toneTherapeutic'),
    analytical: tSettings('toneAnalytical'),
  };

  const toneDescs: Record<string, string> = {
    balanced: t('toneBalancedDesc'),
    mystical: t('toneMysticalDesc'),
    therapeutic: t('toneTherapeuticDesc'),
    analytical: t('toneAnalyticalDesc'),
  };

  const focusLabels: Record<FocusOption, string> = {
    love: t('focusLove'),
    career: t('focusCareer'),
    growth: t('focusGrowth'),
    all: t('focusAll'),
  };

  const focusDescs: Record<FocusOption, string> = {
    love: t('focusLoveDesc'),
    career: t('focusCareerDesc'),
    growth: t('focusGrowthDesc'),
    all: t('focusAllDesc'),
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      {/* Step indicator dots */}
      <View style={styles.progress}>
        <View style={[styles.dot, step >= 1 && styles.dotActive]} />
        <View style={[styles.dot, step >= 2 && styles.dotActive]} />
      </View>

      {step === 1 ? (
        <>
          <Text style={styles.eyebrow}>{t('eyebrow')}</Text>
          <Text style={styles.title}>{t('step1Title')}</Text>
          <Text style={styles.desc}>{t('step1Desc')}</Text>

          <View style={styles.optionsGap}>
            {FOCUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionCard, focus === opt && styles.optionCardActive]}
                onPress={() => setFocus(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionLabel, focus === opt && styles.optionLabelActive]}>
                  {focusLabels[opt]}
                </Text>
                <Text style={[styles.optionDesc, focus === opt && styles.optionDescActive]}>
                  {focusDescs[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, !focus && styles.disabled]}
            onPress={() => setStep(2)}
            disabled={!focus}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{t('next')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.eyebrow}>{t('eyebrow')}</Text>
          <Text style={styles.title}>{t('step2Title')}</Text>
          <Text style={styles.desc}>{t('step2Desc')}</Text>

          <View style={styles.optionsGap}>
            {TONE_STYLES.map((tone) => (
              <TouchableOpacity
                key={tone}
                style={[styles.optionCard, toneStyle === tone && styles.optionCardActive]}
                onPress={() => setToneStyle(tone)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionLabel, toneStyle === tone && styles.optionLabelActive]}>
                  {toneLabels[tone] ?? tone}
                </Text>
                {toneDescs[tone] ? (
                  <Text style={[styles.optionDesc, toneStyle === tone && styles.optionDescActive]}>
                    {toneDescs[tone]}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>{tSettings('spiritualTone')}</Text>
              <Text style={styles.toggleHint}>{tSettings('spiritualToneHint')}</Text>
            </View>
            <View style={styles.toggleControl}>
              <Switch
                value={allowSpiritualTone}
                onValueChange={setAllowSpiritualTone}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={allowSpiritualTone ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={styles.toggleState}>
                {allowSpiritualTone ? tSettings('on') : tSettings('off')}
              </Text>
            </View>
          </View>

          <View style={styles.step2Buttons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← {tNav('back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.primaryButtonFlex,
                (!toneStyle || saving) && styles.disabled,
              ]}
              onPress={handleFinish}
              disabled={!toneStyle || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('start')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Outline skip button */}
      <TouchableOpacity
        style={[styles.skipButton, saving && styles.disabled]}
        onPress={handleSkip}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingTop: 64,
      paddingBottom: 48,
    },
    // Step indicator
    progress: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 40,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    // Page header
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 6,
      textAlign: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 8,
      textAlign: 'center',
    },
    desc: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 22,
      marginBottom: 28,
      textAlign: 'center',
    },
    // Option cards — selectable card buttons
    optionsGap: {
      gap: 10,
      marginBottom: 28,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      gap: 4,
      backgroundColor: colors.card,
      ...cardShadow,
    },
    optionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    optionLabelActive: {
      color: colors.primary,
    },
    optionDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    optionDescActive: {
      color: colors.primary,
    },
    toggleCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 28,
      backgroundColor: colors.card,
      gap: 12,
      ...cardShadow,
    },
    toggleCopy: {
      gap: 4,
    },
    toggleTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    toggleHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    toggleControl: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    toggleState: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    // Primary button
    primaryButton: {
      backgroundColor: colors.primary,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonFlex: {
      flex: 1,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    disabled: {
      opacity: 0.6,
    },
    // Step 2 button row
    step2Buttons: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    backButton: {
      height: 40,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonText: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: '500',
    },
    // Outline skip button
    skipButton: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    skipText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
