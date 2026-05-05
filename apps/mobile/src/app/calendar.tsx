import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calendarApi } from '@clario/api-client';
import type { CalendarDay } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { allMessages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { goBackTo, routes } from '@/lib/navigation';
import { usePullToRefresh } from '@/lib/refresh';

function CalendarSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}
      scrollEnabled={false}
    >
      {/* Back button */}
      <View style={styles.backButton}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={70} height={14} />
      </View>

      {/* Header */}
      <View style={[styles.headerSection, { marginBottom: 16 }]}>
        <Skeleton width={80} height={11} borderRadius={4} style={{ marginBottom: 4 }} />
        <Skeleton width={160} height={26} borderRadius={6} style={{ marginBottom: 4 }} />
        <Skeleton width={'85%'} height={13} borderRadius={6} style={{ marginBottom: 4 }} />
        <Skeleton width={'65%'} height={13} borderRadius={6} />
      </View>

      {/* Legend */}
      <View style={[styles.legend, { marginBottom: 20 }]}>
        {[56, 52, 48, 44].map((w, i) => (
          <Skeleton key={i} width={w} height={14} borderRadius={6} />
        ))}
      </View>

      {/* Month sections ×2 */}
      {[0, 1].map((mi) => (
        <View key={mi} style={styles.monthSection}>
          <Skeleton width={100} height={16} borderRadius={6} style={{ marginBottom: 12 }} />
          <View style={styles.monthGrid}>
            {Array.from({ length: 28 }).map((_, i) => (
              <Skeleton key={i} style={styles.dayCardSkeleton} height={72} borderRadius={10} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const PHASE_EMOJI: Record<string, string> = {
  new: '🌑',
  crescent: '🌒',
  'first-quarter': '🌓',
  gibbous: '🌔',
  full: '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘',
};

const PHASE_KEY_MAP: Record<string, string> = {
  new: 'new',
  crescent: 'crescent',
  'first-quarter': 'firstQuarter',
  gibbous: 'gibbous',
  full: 'full',
  'waning-gibbous': 'waningGibbous',
  'last-quarter': 'lastQuarter',
  'waning-crescent': 'waningCrescent',
};

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const todayStr = new Date().toISOString().slice(0, 10);

export default function CalendarScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  const tCal = useTranslations('calendar');
  const tNav = useTranslations('navigation');
  const signLabels = allMessages[getLocale()].chartDetail.signs as Record<string, string>;
  const phaseLabels = (allMessages[getLocale()].calendar as { phases: Record<string, string> })
    .phases;

  const loadCalendar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { days: data } = await calendarApi.getCalendar();
      setDays(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadCalendar(true));

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  if (loading) {
    return <CalendarSkeleton />;
  }

  // Group days by month
  const months: { name: string; days: CalendarDay[] }[] = [];
  for (const day of days) {
    const d = new Date(day.date + 'T12:00:00Z');
    const monthKey = MONTH_KEYS[d.getUTCMonth()];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthName = `${tCal(`months.${monthKey}` as any)} ${d.getUTCFullYear()}`;
    const existing = months.find((m) => m.name === monthName);
    if (existing) existing.days.push(day);
    else months.push({ name: monthName, days: [day] });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => goBackTo(returnTo, routes.tabs.home)}
      >
        <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
        <Text style={styles.backText}>{tNav('back')}</Text>
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <Text style={styles.eyebrow}>{tCal('eyebrow')}</Text>
        <Text style={styles.heading}>{tCal('heading')}</Text>
        <Text style={styles.description}>{tCal('description')}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>{tCal('legendSun')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
          <Text style={styles.legendText}>{tCal('legendMoon')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>🌑</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={styles.legendText}>{tCal('phases.new' as any)}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>🌕</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={styles.legendText}>{tCal('phases.full' as any)}</Text>
        </View>
      </View>

      {/* Calendar months */}
      {months.map((month) => (
        <View key={month.name} style={styles.monthSection}>
          <Text style={styles.monthHeading}>{month.name}</Text>
          <View style={styles.monthGrid}>
            {month.days.map((day) => {
              const d = new Date(day.date + 'T12:00:00Z');
              const isToday = day.date === todayStr;
              const isSpecialPhase = day.phase === 'new' || day.phase === 'full';
              const phaseEmoji = day.phase ? (PHASE_EMOJI[day.phase] ?? '') : '';
              const phaseKey = day.phase ? PHASE_KEY_MAP[day.phase] : null;
              const phaseLabel = phaseKey ? (phaseLabels[phaseKey] ?? '') : '';

              return (
                <View
                  key={day.date}
                  style={[
                    styles.dayCard,
                    isToday && styles.dayCardToday,
                    isSpecialPhase && !isToday && styles.dayCardSpecial,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                      {d.getUTCDate()}
                    </Text>
                    {phaseEmoji ? <Text style={styles.phaseEmoji}>{phaseEmoji}</Text> : null}
                  </View>
                  {day.sunSign ? (
                    <View style={styles.signRow}>
                      <View style={[styles.signDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.signText} numberOfLines={1}>
                        {signLabels[day.sunSign] ?? day.sunSign}
                      </Text>
                    </View>
                  ) : null}
                  {day.moonSign ? (
                    <View style={styles.signRow}>
                      <View style={[styles.signDot, { backgroundColor: '#0EA5E9' }]} />
                      <Text style={styles.signText} numberOfLines={1}>
                        {signLabels[day.moonSign] ?? day.moonSign}
                      </Text>
                    </View>
                  ) : null}
                  {isSpecialPhase && phaseLabel ? (
                    <Text style={styles.specialPhaseLabel}>{phaseLabel}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 48 },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    backText: { fontSize: 14, color: colors.mutedForeground },
    headerSection: { marginBottom: 16 },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    heading: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    description: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendEmoji: { fontSize: 12, lineHeight: 14 },
    legendText: { fontSize: 12, color: colors.mutedForeground },
    monthSection: { marginBottom: 24 },
    monthHeading: { fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: 10 },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      padding: 12,
      gap: 4,
    },
    dayCardSkeleton: { width: '48%', borderRadius: 12, padding: 0 },
    dayCardToday: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    dayCardSpecial: { borderColor: colors.border },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    dayNumber: { fontSize: 14, fontWeight: '700', color: colors.foreground },
    dayNumberToday: { color: colors.primary },
    phaseEmoji: { fontSize: 14 },
    signRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    signDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
    signText: { fontSize: 11, color: colors.mutedForeground, flex: 1 },
    specialPhaseLabel: { fontSize: 10, fontWeight: '600', color: colors.primary, marginTop: 2 },
  });
}
