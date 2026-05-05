import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { openAdmin, openStore, routes, withReturnTo } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { profileApi, preferencesApi, getAuthHeaders, resolveUrl } from '@clario/api-client';
import type { UserPreferencesResponse } from '@clario/api-client';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import { useConfirm } from '@/components/ConfirmDialog';
import { runToastMutation } from '@/lib/mutation-toast';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useTheme } from '@/lib/theme-context';
import type { ThemePreference } from '@/lib/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TONE_STYLES } from '@clario/types';
import { TimezonePickerModal, timezoneLabel } from '@/components/TimezonePickerModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Skeleton } from '@/components/Skeleton';
import { usePullToRefresh } from '@/lib/refresh';

function SettingsSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Page header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Skeleton width={70} height={10} />
            <Skeleton width={130} height={20} style={{ marginTop: 6 }} />
          </View>
        </View>
        <Skeleton width={'80%'} height={13} style={{ marginTop: 8 }} />
      </View>

      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={16} height={16} borderRadius={4} />
          <Skeleton width={90} height={14} />
        </View>
        <Skeleton width={'85%'} height={12} style={{ marginTop: 4 }} />
        <Skeleton width={60} height={11} style={{ marginTop: 16 }} />
        <Skeleton width={'100%'} height={18} style={{ marginTop: 4 }} />
        <Skeleton width={60} height={11} style={{ marginTop: 12 }} />
        <Skeleton width={'100%'} height={40} borderRadius={8} style={{ marginTop: 4 }} />
        <Skeleton width={80} height={11} style={{ marginTop: 12 }} />
        <Skeleton width={'100%'} height={40} borderRadius={8} style={{ marginTop: 4 }} />
        <Skeleton width={'100%'} height={40} borderRadius={8} style={{ marginTop: 12 }} />
      </View>

      {/* Privacy card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={16} height={16} borderRadius={4} />
          <Skeleton width={80} height={14} />
        </View>
        <Skeleton width={'85%'} height={12} style={{ marginTop: 4 }} />
        <View style={styles.fieldRow}>
          <Skeleton width={'55%'} height={13} />
          <Skeleton width={80} height={22} borderRadius={11} />
        </View>
      </View>

      {/* Preferences card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={16} height={16} borderRadius={4} />
          <Skeleton width={110} height={14} />
        </View>
        <Skeleton width={'80%'} height={12} style={{ marginTop: 4 }} />
        <Skeleton width={60} height={11} style={{ marginTop: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {[80, 70, 90, 80].map((w, i) => (
            <Skeleton key={i} width={w} height={34} borderRadius={8} />
          ))}
        </View>
        <Skeleton width={60} height={11} style={{ marginTop: 12 }} />
        <Skeleton width={'100%'} height={40} borderRadius={8} style={{ marginTop: 6 }} />
      </View>
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [prefs, setPrefs] = useState<UserPreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [tzPickerOpen, setTzPickerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasLoadedRef = useRef(false);
  const { theme: currentTheme, setTheme } = useTheme();

  const tSettings = useTranslations('settingsPage');
  const tNav = useTranslations('navigation');
  const tCredits = useTranslations('credits');
  const tFeedback = useTranslations('feedback');
  const tAdmin = useTranslations('admin');
  const confirm = useConfirm();
  const { locale, setLocalePreference } = useLocale();

  const loadSettings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      const [
        profileData,
        prefsData,
        {
          data: { session },
        },
      ] = await Promise.all([
        profileApi.getProfile(true),
        preferencesApi.getPreferences(),
        supabase.auth.getSession(),
      ]);
      setDisplayName(profileData.display_name ?? '');
      setTimezone(profileData.timezone ?? '');
      setEmail(session?.user?.email ?? '');
      setPrefs(prefsData);
      getAuthHeaders().then((headers) =>
        fetch(resolveUrl('/api/admin/analytics'), { headers })
          .then((r) => setIsAdmin(r.ok))
          .catch(() => {}),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadSettings(true));

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) {
        void loadSettings(true);
        return;
      }

      hasLoadedRef.current = true;
      void loadSettings();
    }, [loadSettings]),
  );

  async function handleSaveName() {
    setSavingName(true);
    try {
      await profileApi.updateProfile({ displayName, timezone: timezone || null });
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    } finally {
      setSavingName(false);
    }
  }

  async function updatePref(update: Partial<UserPreferencesResponse>) {
    if (!prefs) return;
    const next = { ...prefs, ...update };
    setPrefs(next);
    try {
      await preferencesApi.updatePreferences({
        toneStyle: next.tone_style,
        contentFocusLove: next.content_focus_love,
        contentFocusCareer: next.content_focus_career,
        contentFocusGrowth: next.content_focus_growth,
        allowSpiritualTone: next.allow_spiritual_tone,
      });
    } catch {
      // revert on failure
      setPrefs(prefs);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function confirmDeleteAccount() {
    const ok = await confirm({
      title: tSettings('deleteAccountConfirmTitle'),
      description: tSettings('deleteAccountConfirmDesc'),
      confirmText: tSettings('deleteAccountConfirm'),
      cancelText: tSettings('deleteAccountCancel'),
      destructive: true,
    });
    if (ok) await handleDeleteAccount();
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await runToastMutation({
        action: () => profileApi.deleteAccount(),
        silentSuccess: true,
        errorMessage: tSettings('deleteAccountError'),
        toastKey: 'mobile-delete-account',
        onSuccess: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return <SettingsSkeleton />;
  }

  const toneLabels: Record<string, string> = {
    balanced: tSettings('toneBalanced'),
    mystical: tSettings('toneMystical'),
    therapeutic: tSettings('toneTherapeutic'),
    analytical: tSettings('toneAnalytical'),
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{tSettings('sectionLabel')}</Text>
            <Text style={styles.pageTitle}>{tSettings('heading')}</Text>
          </View>
        </View>
        <Text style={styles.pageDesc}>{tSettings('description')}</Text>
      </View>
      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={16} color={colors.primary} />
          <Text style={styles.cardSectionTitle}>{tSettings('profileTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{tSettings('profileDescription')}</Text>

        <Text style={styles.label}>{tSettings('emailLabel')}</Text>
        <Text style={styles.readOnly}>{email || tSettings('emailUnavailable')}</Text>

        <Text style={styles.label}>{tSettings('nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={tSettings('nameLabel')}
          placeholderTextColor={colors.placeholder}
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
        />

        <Text style={styles.label}>{tSettings('timezoneLabel')}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setTzPickerOpen(true)}>
          <Text
            style={[styles.pickerButtonText, !timezone && styles.pickerButtonPlaceholder]}
            numberOfLines={1}
          >
            {timezone ? timezoneLabel(timezone, locale) : tSettings('timezonePlaceholder')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <Text style={styles.fieldHint}>{tSettings('timezoneHint')}</Text>

        <TimezonePickerModal
          visible={tzPickerOpen}
          value={timezone}
          locale={locale}
          onSelect={(tz) => {
            setTimezone(tz);
          }}
          onClose={() => setTzPickerOpen(false)}
        />

        <TouchableOpacity
          style={[styles.primaryButton, savingName && styles.buttonDisabled]}
          onPress={handleSaveName}
          disabled={savingName}
        >
          {savingName ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {savedName ? tSettings('saved') : tSettings('saveProfile')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preferences card */}
      {prefs && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={styles.cardSectionTitle}>{tSettings('preferencesTitle')}</Text>
          </View>
          <Text style={styles.cardDesc}>{tSettings('preferencesDescription')}</Text>

          <Text style={styles.label}>{tSettings('toneLabel')}</Text>
          <View style={styles.toneRow}>
            {TONE_STYLES.map((tone) => (
              <TouchableOpacity
                key={tone}
                style={[styles.toneChip, prefs.tone_style === tone && styles.toneChipActive]}
                onPress={() => updatePref({ tone_style: tone })}
              >
                <Text
                  style={[
                    styles.toneChipText,
                    prefs.tone_style === tone && styles.toneChipTextActive,
                  ]}
                >
                  {toneLabels[tone] ?? tone}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.toggleLabel}>{tSettings('spiritualTone')}</Text>
              <Text style={styles.toggleHint}>{tSettings('spiritualToneHint')}</Text>
            </View>
            <Switch
              value={prefs.allow_spiritual_tone}
              onValueChange={(v) => updatePref({ allow_spiritual_tone: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={
                prefs.allow_spiritual_tone ? colors.primaryForeground : colors.mutedForeground
              }
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>{tSettings('focusAreas')}</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.toggleLabel}>{tSettings('focusLove')}</Text>
              <Text style={styles.toggleHint}>{tSettings('focusLoveHint')}</Text>
            </View>
            <Switch
              value={prefs.content_focus_love}
              onValueChange={(v) => updatePref({ content_focus_love: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={
                prefs.content_focus_love ? colors.primaryForeground : colors.mutedForeground
              }
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.toggleLabel}>{tSettings('focusCareer')}</Text>
              <Text style={styles.toggleHint}>{tSettings('focusCareerHint')}</Text>
            </View>
            <Switch
              value={prefs.content_focus_career}
              onValueChange={(v) => updatePref({ content_focus_career: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={
                prefs.content_focus_career ? colors.primaryForeground : colors.mutedForeground
              }
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.toggleLabel}>{tSettings('focusGrowth')}</Text>
              <Text style={styles.toggleHint}>{tSettings('focusGrowthHint')}</Text>
            </View>
            <Switch
              value={prefs.content_focus_growth}
              onValueChange={(v) => updatePref({ content_focus_growth: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={
                prefs.content_focus_growth ? colors.primaryForeground : colors.mutedForeground
              }
            />
          </View>
          <Text style={styles.prefsHint}>{tSettings('preferencesHint')}</Text>
        </View>
      )}

      {/* Theme card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
          <Text style={styles.cardSectionTitle}>{tSettings('themeTitle')}</Text>
        </View>
        <View style={styles.themeButtons}>
          {(['light', 'dark', 'system'] as ThemePreference[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.themeButton, currentTheme === opt && styles.themeButtonActive]}
              onPress={() => setTheme(opt)}
            >
              <Ionicons
                name={
                  opt === 'light'
                    ? 'sunny-outline'
                    : opt === 'dark'
                      ? 'moon-outline'
                      : 'phone-portrait-outline'
                }
                size={15}
                color={currentTheme === opt ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.themeButtonText,
                  currentTheme === opt && styles.themeButtonTextActive,
                ]}
              >
                {tSettings(
                  opt === 'light' ? 'themeLight' : opt === 'dark' ? 'themeDark' : 'themeSystem',
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="language-outline" size={16} color={colors.primary} />
          <Text style={styles.cardSectionTitle}>{tSettings('languageTitle')}</Text>
        </View>
        <View style={styles.themeButtons}>
          {(['ru', 'en'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.themeButton, locale === lang && styles.themeButtonActive]}
              onPress={() => void setLocalePreference(lang)}
            >
              <Text
                style={[styles.themeButtonText, locale === lang && styles.themeButtonTextActive]}
              >
                {tSettings(lang === 'ru' ? 'languageRu' : 'languageEn')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Store link */}
      <TouchableOpacity
        style={styles.outlineButton}
        onPress={() => openStore(routes.tabs.settings)}
      >
        <Ionicons name="storefront-outline" size={16} color={colors.primary} />
        <Text style={styles.outlineButtonText}>{tCredits('storeTitle')}</Text>
      </TouchableOpacity>

      {/* Feedback */}
      <TouchableOpacity style={styles.outlineButton} onPress={() => setFeedbackOpen(true)}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
        <Text style={styles.outlineButtonText}>{tFeedback('title')}</Text>
      </TouchableOpacity>
      <FeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Admin panel — only for admins */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => openAdmin(routes.tabs.settings)}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.outlineButtonText}>{tAdmin('title')}</Text>
        </TouchableOpacity>
      )}

      {/* Danger Zone card */}
      <View style={styles.dangerCard}>
        <View style={styles.dangerCardHeader}>
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          <Text style={styles.dangerTitle}>{tSettings('dangerZoneTitle')}</Text>
        </View>
        <Text style={styles.dangerDesc}>{tSettings('dangerZoneDescription')}</Text>
        <Text style={styles.dangerAccountLabel}>{tSettings('deleteAccountLabel')}</Text>
        <Text style={styles.dangerHint}>{tSettings('deleteAccountHint')}</Text>
        <TouchableOpacity
          style={[styles.destructiveOutlineButton, deletingAccount && styles.buttonDisabled]}
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <Text style={styles.destructiveOutlineButtonText}>
              {tSettings('deleteAccountButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => {
          const ok = await confirm({
            title: tNav('logout'),
            confirmText: tNav('logout'),
            cancelText: tSettings('deleteAccountCancel'),
            destructive: true,
          });
          if (ok) await handleSignOut();
        }}
      >
        <Ionicons name="log-out-outline" size={16} color={colors.destructive} />
        <Text style={styles.signOutText}>{tNav('logout')}</Text>
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
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 48,
      gap: 12,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    headerBar: {
      paddingTop: 56,
      paddingBottom: 8,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 2,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    pageDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
      ...cardShadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    cardSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    cardDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
      marginBottom: 4,
    },
    // Privacy card
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    fieldLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    prefsHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
      marginTop: 4,
    },
    fieldHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
      marginTop: 4,
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    readOnly: {
      fontSize: 15,
      color: colors.foreground,
      paddingVertical: 2,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    pickerButton: {
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    pickerButtonText: {
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      marginRight: 8,
    },
    pickerButtonPlaceholder: {
      color: colors.placeholder,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    savingHint: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    toneRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    toneChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 99,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    toneChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toneChipText: {
      fontSize: 13,
      color: colors.foreground,
    },
    toneChipTextActive: {
      color: colors.primaryForeground,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    toggleLabel: {
      fontSize: 14,
      color: colors.foreground,
    },
    toggleHint: {
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 15,
      marginTop: 2,
    },
    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      height: 40,
      borderRadius: 8,
    },
    outlineButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    dangerCard: {
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: colors.destructiveSubtle,
      borderRadius: 12,
      padding: 16,
      gap: 8,
    },
    dangerCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dangerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.destructive,
    },
    dangerDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
    },
    dangerAccountLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
      marginTop: 4,
    },
    dangerHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
    },
    destructiveOutlineButton: {
      borderWidth: 1,
      borderColor: colors.destructive,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    destructiveOutlineButtonText: {
      color: colors.destructive,
      fontSize: 14,
      fontWeight: '600',
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      height: 40,
      borderRadius: 8,
    },
    signOutText: {
      color: colors.destructive,
      fontSize: 15,
      fontWeight: '600',
    },
    themeButtons: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    themeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    themeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.mutedForeground,
    },
    themeButtonTextActive: {
      color: colors.primaryForeground,
    },
  });
}
