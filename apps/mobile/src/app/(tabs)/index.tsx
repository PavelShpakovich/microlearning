import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import {
  openCalendar,
  openChartDetail,
  openChartsTab,
  openChartShortcut,
  openCompatibilityTab,
  openHoroscope,
  openNewChart,
  openReadingShortcut,
  openReadingsTab,
  openStore,
  routes,
} from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import {
  profileApi,
  chartsApi,
  readingsApi,
  creditsApi,
  compatibilityApi,
  forecastsApi,
  skyApi,
} from '@clario/api-client';
import type { ChartRecord, ReadingRecord, TodaySkyResponse } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { getChartElement, getElementColors } from '@/lib/chart-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { usePullToRefresh } from '@/lib/refresh';

const SIGN_ELEMENT: Record<string, string> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#f97316',
  earth: '#059669',
  air: '#0ea5e9',
  water: '#3b82f6',
};

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☀',
  moon: '☽',
  mercury: '☿',
};

interface ForecastWidget {
  keyTheme?: string;
  advice?: string;
  hasContent: boolean;
}

function DashboardSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerLeft}>
          <Skeleton width={80} height={10} />
          <Skeleton width={'70%'} height={22} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={64} height={28} borderRadius={20} />
      </View>

      {/* Sky widget */}
      <View style={styles.skyWidget}>
        <Skeleton width={80} height={10} />
        <View style={styles.skyPlanets}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skyPlanetItem}>
              <Skeleton width={26} height={26} borderRadius={13} />
              <View style={{ gap: 4 }}>
                <Skeleton width={46} height={10} />
                <Skeleton width={60} height={12} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Horoscope widget */}
      <View style={styles.horoscopeWidget}>
        <View style={styles.horoscopeLeft}>
          <Skeleton width={100} height={10} />
          <Skeleton width={'80%'} height={14} style={{ marginTop: 4 }} />
          <Skeleton width={'60%'} height={11} style={{ marginTop: 3 }} />
        </View>
        <Skeleton width={72} height={32} borderRadius={7} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.statCard, i === 1 && styles.statCardMiddle]}>
            <Skeleton width={32} height={24} />
            <Skeleton width={50} height={10} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Quick actions card */}
      <View style={styles.quickActionsCard}>
        <Skeleton width={100} height={12} />
        <View style={styles.quickActionsButtons}>
          <Skeleton width={'32%'} height={36} borderRadius={8} />
          <Skeleton width={'32%'} height={36} borderRadius={8} />
          <Skeleton width={'32%'} height={36} borderRadius={8} />
        </View>
      </View>

      {/* Recent charts */}
      <View style={styles.sectionHeader}>
        <Skeleton width={110} height={14} />
        <Skeleton width={70} height={12} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.chartCard}>
          <View style={styles.chartCardRow}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={[styles.chartCardInfo, { gap: 4 }]}>
              <Skeleton width={'60%'} height={14} />
              <Skeleton width={'45%'} height={11} />
              <Skeleton width={'70%'} height={11} />
            </View>
            <Skeleton width={44} height={20} borderRadius={10} />
          </View>
        </View>
      ))}

      {/* Recent readings */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Skeleton width={120} height={14} />
        <Skeleton width={70} height={12} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.readingCard}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <View style={[styles.readingInfo, { gap: 4 }]}>
            <Skeleton width={'65%'} height={13} />
            <Skeleton width={'50%'} height={10} />
          </View>
        </View>
      ))}

      {/* Store banner */}
      <View style={[styles.storeBanner, { marginTop: 16 }]}>
        <Skeleton width={90} height={14} />
        <Skeleton width={60} height={12} />
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [balance, setBalance] = useState(0);
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [totalCharts, setTotalCharts] = useState(0);
  const [totalReadings, setTotalReadings] = useState(0);
  const [totalCompatibility, setTotalCompatibility] = useState(0);
  const [todaySky, setTodaySky] = useState<TodaySkyResponse>({
    sun: null,
    moon: null,
    mercury: null,
  });
  const [hasPrimaryChart, setHasPrimaryChart] = useState(false);
  const [forecast, setForecast] = useState<ForecastWidget | null>(null);

  const tDashboard = useTranslations('dashboard');
  const tChart = useTranslations('chartDetail');
  const tWorkspace = useTranslations('workspace');
  const tCredits = useTranslations('credits');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [profileData, chartsData, readingsData, balanceData, compatData] = await Promise.all([
        profileApi.getProfile(true),
        chartsApi.listCharts(),
        readingsApi.listReadings(),
        creditsApi.getBalance(true),
        compatibilityApi.listReports(),
      ]);

      setDisplayName(profileData.display_name ?? '');
      setBalance(balanceData.balance);
      setTotalCharts(chartsData.charts.length);
      setTotalReadings(readingsData.readings.length);
      setTotalCompatibility(compatData.reports.length);
      setCharts(chartsData.charts.slice(0, 3));
      setReadings(readingsData.readings.slice(0, 4));

      const primary =
        chartsData.charts.find((c) => c.status === 'ready' && c.subject_type === 'self') ??
        chartsData.charts.find((c) => c.status === 'ready');
      setHasPrimaryChart(!!primary);

      // Load widgets in parallel, non-blocking
      const [skyData, forecastData] = await Promise.all([
        skyApi.getToday().catch(() => ({ sun: null, moon: null, mercury: null })),
        primary ? forecastsApi.getDailyForecast().catch(() => null) : Promise.resolve(null),
      ]);

      setTodaySky(skyData);

      if (forecastData?.forecast?.rendered_content_json) {
        const fc = forecastData.forecast.rendered_content_json as Record<string, unknown>;
        setForecast({
          keyTheme: typeof fc.keyTheme === 'string' ? fc.keyTheme : undefined,
          advice: typeof fc.advice === 'string' ? fc.advice : undefined,
          hasContent: typeof fc.interpretation === 'string',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => load(true));

  const isFirstLoad = useRef(true);

  useFocusEffect(
    useCallback(() => {
      const refresh = !isFirstLoad.current;
      isFirstLoad.current = false;
      void load(refresh);
    }, [load]),
  );

  const hasSky = !!(todaySky.sun ?? todaySky.moon);

  if (loading) {
    return <DashboardSkeleton />;
  }

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
      <View style={[styles.header, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>{tDashboard('subheading')}</Text>
          <Text style={styles.greeting}>
            {tDashboard('heading')}
            {displayName ? `, ${displayName}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.balanceChip}
          onPress={() => openStore(routes.tabs.home)}
          activeOpacity={0.75}
        >
          <Ionicons name="wallet" size={13} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.balanceText}>{balance}</Text>
        </TouchableOpacity>
      </View>
      {/* Today's Sky widget — taps to calendar */}
      {hasSky && (
        <TouchableOpacity style={styles.skyWidget} onPress={() => openCalendar(routes.tabs.home)}>
          <Text style={styles.skyWidgetEyebrow}>{tDashboard('skyToday')}</Text>
          <View style={styles.skyPlanets}>
            {(['sun', 'moon', 'mercury'] as const).map((key) => {
              const sign = todaySky[key];
              if (!sign) return null;
              const el = SIGN_ELEMENT[sign] ?? '';
              const color = ELEMENT_COLORS[el] ?? colors.mutedForeground;
              return (
                <View key={key} style={styles.skyPlanetItem}>
                  <Text style={[styles.skyPlanetSymbol, { color }]}>{PLANET_SYMBOLS[key]}</Text>
                  <View>
                    <Text style={styles.skyPlanetName}>
                      {tChart(`planets.${key}` as Parameters<typeof tChart>[0])}
                    </Text>
                    <Text style={[styles.skySignName, { color }]}>
                      {tChart(`signs.${sign}` as Parameters<typeof tChart>[0]) ?? sign}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      )}
      {hasPrimaryChart && (
        <View style={styles.horoscopeWidget}>
          <View style={styles.horoscopeLeft}>
            <Text style={styles.horoscopeEyebrow}>{tDashboard('horoscopeWidgetTitle')}</Text>
            {forecast?.keyTheme ? (
              <Text style={styles.horoscopeTheme}>{forecast.keyTheme}</Text>
            ) : (
              <Text style={styles.horoscopeDesc}>{tDashboard('horoscopeWidgetDesc')}</Text>
            )}
            {forecast?.advice ? (
              <Text style={styles.horoscopeAdvice} numberOfLines={2}>
                {forecast.advice}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.horoscopeButton}
            onPress={() => openHoroscope(routes.tabs.home)}
          >
            <Text style={styles.horoscopeButtonText}>
              {forecast?.hasContent ? tDashboard('horoscopeRead') : tDashboard('horoscopeOpen')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={openChartsTab}>
          <Text style={styles.statValue}>{totalCharts}</Text>
          <Text style={styles.statLabel}>{tDashboard('statsCharts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, styles.statCardMiddle]}
          onPress={openReadingsTab}
        >
          <Text style={styles.statValue}>{totalReadings}</Text>
          <Text style={styles.statLabel}>{tDashboard('statsReadings')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={openCompatibilityTab}>
          <Text style={styles.statValue}>{totalCompatibility}</Text>
          <Text style={styles.statLabel}>{tDashboard('statsCompatibility')}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsLabel}>{tDashboard('quickActions')}</Text>
        <View style={styles.quickActionsButtons}>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionPrimary]}
            onPress={() => openNewChart(routes.tabs.charts)}
          >
            <Text style={styles.quickActionPrimaryText}>{tDashboard('createNewChart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionOutline]}
            onPress={openChartsTab}
          >
            <Text style={styles.quickActionOutlineText}>{tDashboard('viewAllCharts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionOutline]}
            onPress={openReadingsTab}
          >
            <Text style={styles.quickActionOutlineText}>{tDashboard('viewAllReadings')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Charts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tDashboard('recentCharts')}</Text>
        <TouchableOpacity onPress={openChartsTab}>
          <Text style={styles.sectionLink}>{tDashboard('viewAllCharts')} →</Text>
        </TouchableOpacity>
      </View>
      {charts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{tDashboard('noCharts')}</Text>
        </View>
      ) : (
        charts.map((chart) => (
          <TouchableOpacity
            key={chart.id}
            style={styles.chartCard}
            onPress={() => openChartShortcut(chart.id)}
          >
            <View style={styles.chartCardRow}>
              {(() => {
                const element = getChartElement(chart);
                const elementColors = getElementColors(element, colors);
                return (
                  <View style={[styles.avatar, { backgroundColor: elementColors.bg }]}>
                    <Text style={[styles.avatarText, { color: elementColors.text }]}>
                      {chart.person_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                );
              })()}
              <View style={styles.chartCardInfo}>
                <Text style={styles.chartCardLabel}>{chart.label}</Text>
                <Text style={styles.chartCardSub}>{chart.person_name}</Text>
                <Text style={styles.chartCardSub}>
                  {chart.birth_date} · {chart.city}, {chart.country}
                </Text>
              </View>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>
                  {tWorkspace(
                    `subjectTypes.${chart.subject_type}` as Parameters<typeof tWorkspace>[0],
                  ) ?? chart.subject_type}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Recent Readings */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>{tDashboard('recentReadings')}</Text>
        <TouchableOpacity onPress={openReadingsTab}>
          <Text style={styles.sectionLink}>{tDashboard('viewAllReadings')} →</Text>
        </TouchableOpacity>
      </View>
      {readings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{tDashboard('noReadings')}</Text>
        </View>
      ) : (
        readings.map((reading) => (
          <TouchableOpacity
            key={reading.id}
            style={styles.readingCard}
            onPress={() => openReadingShortcut(reading.id)}
          >
            <Text style={styles.readingIcon}>✦</Text>
            <View style={styles.readingInfo}>
              <Text style={styles.readingTitle} numberOfLines={1}>
                {reading.title ||
                  tDashboard(
                    `readingTypes.${reading.reading_type}` as Parameters<typeof tDashboard>[0],
                  ) ||
                  reading.reading_type}
              </Text>
              <Text style={styles.readingMeta}>
                {tDashboard(
                  `readingTypes.${reading.reading_type}` as Parameters<typeof tDashboard>[0],
                ) ?? reading.reading_type}
                {' · '}
                {new Date(reading.created_at).toLocaleDateString(getLocale())}
              </Text>
            </View>
            {reading.status !== 'ready' && (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{tDashboard('statusPending')}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Store / credits banner */}
      <TouchableOpacity style={styles.storeBanner} onPress={() => openStore(routes.tabs.home)}>
        <Text style={styles.storeBannerLeft}>{tCredits('storeTitle')}</Text>
        <Text style={styles.storeBannerRight}>
          {balance} {tCredits('creditsUnit')} →
        </Text>
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
      paddingBottom: 48,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    // ── Header ──────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    headerLeft: {
      flex: 1,
      paddingRight: 12,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    greeting: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    balanceChip: {
      backgroundColor: colors.primaryTint,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'flex-start',
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    balanceText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },

    // ── Today's Sky ─────────────────────────────────────────────────────────────
    skyWidget: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      ...cardShadow,
    },
    skyWidgetEyebrow: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 12,
    },
    skyPlanets: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    skyPlanetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    skyPlanetSymbol: {
      fontSize: 22,
    },
    skyPlanetName: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: 14,
    },
    skySignName: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 18,
    },

    // ── Horoscope widget ────────────────────────────────────────────────────────
    horoscopeWidget: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...cardShadow,
    },
    horoscopeLeft: {
      flex: 1,
      gap: 3,
    },
    horoscopeEyebrow: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    horoscopeTheme: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    horoscopeDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    horoscopeAdvice: {
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 16,
    },
    horoscopeButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 0,
    },
    horoscopeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },

    // ── Stats row ───────────────────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      ...cardShadow,
    },
    statCard: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statCardMiddle: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
    },

    // ── Quick actions ────────────────────────────────────────────────────────────
    quickActionsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 24,
      gap: 12,
      ...cardShadow,
    },
    quickActionsLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
    },
    quickActionsButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    quickActionButton: {
      flex: 1,
      borderRadius: 8,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    quickActionPrimary: {
      backgroundColor: colors.primary,
    },
    quickActionOutline: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionPrimaryText: {
      color: colors.primaryForeground,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    quickActionOutlineText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },

    // ── Section header ───────────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    sectionLink: {
      fontSize: 13,
      color: colors.primary,
    },

    // ── Chart cards ──────────────────────────────────────────────────────────────
    chartCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      ...cardShadow,
    },
    chartCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    chartCardInfo: {
      flex: 1,
      gap: 1,
    },
    chartCardLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    chartCardSub: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    subjectBadge: {
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexShrink: 0,
    },
    subjectBadgeText: {
      fontSize: 10,
      color: colors.mutedForeground,
      textTransform: 'capitalize',
    },

    // ── Reading cards ────────────────────────────────────────────────────────────
    readingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      ...cardShadow,
    },
    readingIcon: {
      fontSize: 16,
      color: colors.primary,
      flexShrink: 0,
    },
    readingInfo: {
      flex: 1,
      gap: 2,
    },
    readingTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    readingMeta: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    statusChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexShrink: 0,
    },
    statusChipText: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontWeight: '500',
    },

    // ── Empty state ───────────────────────────────────────────────────────────────
    emptyState: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },

    // ── Store banner ──────────────────────────────────────────────────────────────
    storeBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.primarySubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      padding: 14,
      marginTop: 16,
    },
    storeBannerLeft: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: '600',
    },
    storeBannerRight: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
