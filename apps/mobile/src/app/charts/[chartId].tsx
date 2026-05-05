import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  goBackTo,
  goToRoute,
  openChartEdit,
  openCompatibilityNew,
  openReadingDetail,
  resolveParentRoute,
  routes,
} from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { chartsApi, readingsApi } from '@clario/api-client';
import type { ChartDetail, ChartReadingRow } from '@clario/api-client';
import { READING_TYPES } from '@clario/types';
import { useTranslations, getLocale } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { runToastMutation } from '@/lib/mutation-toast';
import { allMessages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { getSignElement, getElementColors } from '@/lib/chart-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartWheel } from '@/components/ChartWheel';
import type { WheelPosition, WheelAspect } from '@/components/ChartWheel';
import { Skeleton } from '@/components/Skeleton';
import { ApiClientError } from '@clario/api-client';
import { useInsufficientCredits } from '@/lib/insufficient-credits-context';
import { usePullToRefresh } from '@/lib/refresh';

function ChartDetailSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Nav row with back button */}
      <View style={[styles.navRow, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width={90} height={14} />
        </View>
        <Skeleton width={70} height={14} />
      </View>
      {/* Hero card */}
      <View style={[styles.heroCard, { gap: 12 }]}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Skeleton width={56} height={56} borderRadius={28} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={'60%'} height={16} />
            <Skeleton width={'40%'} height={12} />
            <Skeleton width={80} height={12} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Skeleton width={72} height={22} borderRadius={11} />
              <Skeleton width={72} height={22} borderRadius={11} />
              <Skeleton width={72} height={22} borderRadius={11} />
            </View>
          </View>
        </View>
        <Skeleton width={'100%'} height={1} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Skeleton width={60} height={30} borderRadius={8} />
          <Skeleton width={60} height={30} borderRadius={8} />
          <Skeleton width={60} height={30} borderRadius={8} />
        </View>
      </View>
      {/* Wheel placeholder */}
      <Skeleton width={'100%'} height={300} borderRadius={12} />
      {/* Section cards */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.heroCard, { gap: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Skeleton width={16} height={16} borderRadius={4} />
            <Skeleton width={120} height={14} />
          </View>
          <Skeleton width={'90%'} height={12} />
          <Skeleton width={'75%'} height={12} />
          <Skeleton width={'80%'} height={12} />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Astrology maps ─────────────────────────────────────────────────────────────
const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
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

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  aries: 'cardinal',
  cancer: 'cardinal',
  libra: 'cardinal',
  capricorn: 'cardinal',
  taurus: 'fixed',
  leo: 'fixed',
  scorpio: 'fixed',
  aquarius: 'fixed',
  gemini: 'mutable',
  virgo: 'mutable',
  sagittarius: 'mutable',
  pisces: 'mutable',
};

const BALANCE_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

const SIGN_RULER: Record<string, string> = {
  aries: 'mars',
  taurus: 'venus',
  gemini: 'mercury',
  cancer: 'moon',
  leo: 'sun',
  virgo: 'mercury',
  libra: 'venus',
  scorpio: 'pluto',
  sagittarius: 'jupiter',
  capricorn: 'saturn',
  aquarius: 'uranus',
  pisces: 'neptune',
};

const SIGN_POLARITY: Record<string, 'masculine' | 'feminine'> = {
  aries: 'masculine',
  taurus: 'feminine',
  gemini: 'masculine',
  cancer: 'feminine',
  leo: 'masculine',
  virgo: 'feminine',
  libra: 'masculine',
  scorpio: 'feminine',
  sagittarius: 'masculine',
  capricorn: 'feminine',
  aquarius: 'masculine',
  pisces: 'feminine',
};

const PLANET_ORDER = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  ascendant: 'AC',
  midheaven: 'MC',
};

const PLANET_COLORS_HEX: Record<string, string> = {
  sun: '#F59E0B',
  moon: '#64748B',
  mercury: '#10B981',
  venus: '#EC4899',
  mars: '#EF4444',
  jupiter: '#8B5CF6',
  saturn: '#6B7280',
  uranus: '#06B6D4',
  neptune: '#3B82F6',
  pluto: '#78350F',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
};

const ASPECT_COLORS_HEX: Record<string, string> = {
  conjunction: '#D4A017', // primary gold
  sextile: '#0EA5E9',
  square: '#F85149', // destructive red
  trine: '#10B981',
  opposition: '#F97316',
};

const HOUSE_SYSTEM_KEYS: Record<string, string> = {
  placidus: 'housePlacidus',
  equal: 'houseEqual',
  whole_sign: 'houseWholeSigns',
  porphyry: 'housePorphyry',
  regiomontanus: 'houseRegiomontanus',
  campanus: 'houseCampanus',
  koch: 'houseKoch',
};

const PLANET_DOMICILE: Record<string, string[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius'],
};
const PLANET_EXALTATION: Record<string, string> = {
  sun: 'aries',
  moon: 'taurus',
  mercury: 'virgo',
  venus: 'pisces',
  mars: 'capricorn',
  jupiter: 'cancer',
  saturn: 'libra',
};
const PLANET_DETRIMENT: Record<string, string[]> = {
  sun: ['aquarius'],
  moon: ['capricorn'],
  mercury: ['sagittarius', 'pisces'],
  venus: ['aries', 'scorpio'],
  mars: ['taurus', 'libra'],
  jupiter: ['gemini', 'virgo'],
  saturn: ['cancer', 'leo'],
};
const PLANET_FALL: Record<string, string> = {
  sun: 'libra',
  moon: 'scorpio',
  mercury: 'pisces',
  venus: 'virgo',
  mars: 'cancer',
  jupiter: 'capricorn',
  saturn: 'aries',
};

const DIGNITY_COLORS: Record<string, { bg: string; text: string }> = {
  domicile: { bg: '#D1FAE5', text: '#065F46' },
  exaltation: { bg: '#FEF3C7', text: '#92400E' },
  detriment: { bg: '#FFEDD5', text: '#9A3412' },
  fall: { bg: '#FEE2E2', text: '#991B1B' },
};

function getDignity(
  bodyKey: string,
  signKey: string,
): 'domicile' | 'exaltation' | 'detriment' | 'fall' | null {
  if (PLANET_DOMICILE[bodyKey]?.includes(signKey)) return 'domicile';
  if (PLANET_EXALTATION[bodyKey] === signKey) return 'exaltation';
  if (PLANET_DETRIMENT[bodyKey]?.includes(signKey)) return 'detriment';
  if (PLANET_FALL[bodyKey] === signKey) return 'fall';
  return null;
}

function formatDeg(degreeDecimal: number): string {
  const inSign = degreeDecimal % 30;
  let deg = Math.floor(inSign);
  let min = Math.round((inSign - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChartDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { chartId, returnTo } = useLocalSearchParams<{ chartId: string; returnTo?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const readingsSectionY = useRef(0);
  const PAGE_SIZE = 5;

  const [detail, setDetail] = useState<ChartDetail | null>(null);
  const [linkedReadings, setLinkedReadings] = useState<ChartReadingRow[]>([]);
  const [readingsTotal, setReadingsTotal] = useState(0);
  const [readingsPage, setReadingsPage] = useState(1);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [creatingReading, setCreatingReading] = useState<string | null>(null);

  const tChart = useTranslations('chartDetail');
  const tCreateReading = useTranslations('createReading');

  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');

  // Translation map references (locale-aware)
  const m = allMessages[getLocale()];
  const signLabels = m.chartDetail.signs as Record<string, string>;
  const planetLabels = m.chartDetail.planets as Record<string, string>;
  const signKeywords = m.chartDetail.signKeywords as Record<string, string>;
  const planetMeanings = m.chartDetail.planetMeanings as Record<string, string>;
  const aspectNames = m.chartDetail.aspectNames as Record<string, string>;
  const subjectTypeLabels = m.workspace.subjectTypes as Record<string, string>;
  const elementLabels = m.chartDetail.elements as Record<string, string>;
  const modalityLabels = m.chartDetail.modalities as Record<string, string>;
  const dignityLabels = m.chartDetail.dignity as Record<string, string>;
  const dignityShortLabels = m.chartDetail.dignityShort as Record<string, string>;
  const polarityLabels = m.chartDetail.polarity as Record<string, string>;

  const backTarget = resolveParentRoute(returnTo, routes.tabs.charts);
  const backLabel = backTarget === routes.tabs.home ? tDashboard('pageTitle') : tChart('allCharts');
  const { showInsufficientCredits } = useInsufficientCredits();

  const loadChartDetail = useCallback(
    async (isRefresh = false) => {
      if (!chartId) return;
      if (!isRefresh) setLoading(true);

      try {
        const [chartData, readingsData] = await Promise.all([
          chartsApi.getChart(chartId),
          chartsApi.listChartReadings(chartId, 1, PAGE_SIZE),
        ]);
        setDetail(chartData);
        setLinkedReadings(readingsData.readings);
        setReadingsTotal(readingsData.total);
        setReadingsPage(1);
      } finally {
        setLoading(false);
      }
    },
    [PAGE_SIZE, chartId],
  );

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadChartDetail(true));

  useEffect(() => {
    void loadChartDetail();
  }, [loadChartDetail]);

  useFocusEffect(
    useCallback(() => {
      if (loading) return;
      void loadChartDetail(true);
    }, [loadChartDetail, loading]),
  );

  async function loadReadingsPage(page: number) {
    if (!chartId || readingsLoading) return;
    setReadingsLoading(true);
    try {
      const data = await chartsApi.listChartReadings(chartId, page, PAGE_SIZE);
      setLinkedReadings(data.readings);
      setReadingsTotal(data.total);
      setReadingsPage(data.page);
      scrollViewRef.current?.scrollTo({ y: readingsSectionY.current, animated: true });
    } catch {
      toast.error(tChart('loadError' as Parameters<typeof tChart>[0]));
    } finally {
      setReadingsLoading(false);
    }
  }

  async function handleCreateReading(readingType: string) {
    if (!chartId) return;
    setCreatingReading(readingType);
    try {
      await runToastMutation({
        action: () => readingsApi.createReading({ chartId, readingType }),
        silentSuccess: true,
        errorMessage: tCreateReading('error'),
        mapErrorMessage: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            return undefined;
          }

          return tCreateReading('error');
        },
        toastKey: `mobile-create-reading-${readingType}`,
        onSuccess: ({ reading }) => {
          setShowReadingModal(false);
          openReadingDetail(reading.id, routes.charts.detail(chartId));
        },
        onError: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            setShowReadingModal(false);
            const data = error.data as { required?: number; balance?: number } | undefined;
            showInsufficientCredits({ required: data?.required, balance: data?.balance });
          }
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setCreatingReading(null);
    }
  }

  const readingTypeLabels: Record<string, string> = {
    natal_overview: tCreateReading('type_natal_overview'),
    personality: tCreateReading('type_personality'),
    love: tCreateReading('type_love'),
    career: tCreateReading('type_career'),
    strengths: tCreateReading('type_strengths'),
    transit: tCreateReading('type_transit'),
  };

  const readingStatusColors: Record<string, string> = {
    ready: colors.success,
    error: colors.error,
    pending: '#d97706',
    generating: '#d97706',
  };

  const readingStatusLabels: Record<string, string> = {
    ready: tChart('statusReady'),
    error: tChart('statusError'),
    pending: tChart('statusPending'),
    generating: tChart('statusPending'),
  };

  if (loading) {
    return <ChartDetailSkeleton />;
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Ionicons name="planet-outline" size={44} color={colors.border} />
        <Text style={styles.fallbackTitle}>{tChart('notFoundTitle')}</Text>
        <Text style={styles.fallbackDescription}>{tChart('notFoundDesc')}</Text>
        <View style={styles.fallbackActions}>
          <TouchableOpacity
            style={styles.fallbackPrimaryButton}
            onPress={() => goBackTo(returnTo, routes.tabs.charts)}
          >
            <Text style={styles.fallbackPrimaryButtonText}>{backLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fallbackSecondaryButton}
            onPress={() => void loadChartDetail(true)}
          >
            <Text style={styles.fallbackSecondaryButtonText}>{tChart('retryLoad')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { chart } = detail;

  // ── Positions ──────────────────────────────────────────────────────────────
  const latestSnap = detail.snapshots?.[0];

  const allLatestPositions = latestSnap
    ? detail.positions.filter((p) => p.chart_snapshot_id === latestSnap.id)
    : [];

  const sortedPlanets = allLatestPositions
    .filter((p) => !['ascendant', 'midheaven'].includes(p.body_key))
    .sort((a, b) => {
      const ai = PLANET_ORDER.indexOf(a.body_key);
      const bi = PLANET_ORDER.indexOf(b.body_key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const angles = allLatestPositions.filter((p) => ['ascendant', 'midheaven'].includes(p.body_key));

  const sortedAspects = latestSnap
    ? detail.aspects
        .filter((a) => a.chart_snapshot_id === latestSnap.id)
        .sort((a, b) => a.orb_decimal - b.orb_decimal)
    : [];

  // ── Big Three ──────────────────────────────────────────────────────────────
  const sunPos = sortedPlanets.find((p) => p.body_key === 'sun');
  const moonPos = sortedPlanets.find((p) => p.body_key === 'moon');
  const ascPos = angles.find((p) => p.body_key === 'ascendant');
  const sunSign = sunPos ? (signLabels[sunPos.sign_key] ?? sunPos.sign_key) : '';
  const moonSign = moonPos ? (signLabels[moonPos.sign_key] ?? moonPos.sign_key) : '';
  const ascSign = ascPos ? (signLabels[ascPos.sign_key] ?? ascPos.sign_key) : '';

  // ── Avatar element colors ──────────────────────────────────────────────────
  const chartElement = sunPos ? getSignElement(sunPos.sign_key) : null;
  const avatarColors = getElementColors(chartElement, colors);

  // ── Element / modality balance ─────────────────────────────────────────────
  const balancePlanets = allLatestPositions.filter((p) => BALANCE_BODIES.includes(p.body_key));
  const elementCounts = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of balancePlanets) {
    const el = SIGN_ELEMENT[p.sign_key];
    const mod = SIGN_MODALITY[p.sign_key];
    if (el) elementCounts[el]++;
    if (mod) modalityCounts[mod]++;
  }

  // ── About Chart (ruler, day/night) ────────────────────────────────────────
  const chartRulerKey = ascPos ? SIGN_RULER[ascPos.sign_key] : undefined;
  const chartRulerPos = chartRulerKey
    ? allLatestPositions.find((p) => p.body_key === chartRulerKey)
    : undefined;
  const isDay = sunPos?.house_number != null && sunPos.house_number >= 7;
  const hasTimeData = chart.birth_time_known && ascPos != null;

  // ── Polarity ───────────────────────────────────────────────────────────────
  const polarityCounts = { masculine: 0, feminine: 0 };
  for (const p of balancePlanets) {
    const pol = SIGN_POLARITY[p.sign_key];
    if (pol) polarityCounts[pol]++;
  }

  // ── Stelliums ──────────────────────────────────────────────────────────────
  const signGroups: Record<string, string[]> = {};
  const houseGroups: Record<number, string[]> = {};
  for (const p of sortedPlanets) {
    (signGroups[p.sign_key] ??= []).push(p.body_key);
    if (p.house_number != null) (houseGroups[p.house_number] ??= []).push(p.body_key);
  }
  const signStelliums = Object.entries(signGroups).filter(([, v]) => v.length >= 3);
  const houseStelliums = Object.entries(houseGroups).filter(([, v]) => v.length >= 3);

  // ── Dignities ──────────────────────────────────────────────────────────────
  const dignities = sortedPlanets
    .map((p) => ({
      body: p.body_key,
      sign: p.sign_key,
      dignity: getDignity(p.body_key, p.sign_key),
    }))
    .filter((d) => d.dignity !== null);

  // ── Unaspected planets ─────────────────────────────────────────────────────
  const aspectedBodies = new Set<string>();
  for (const a of sortedAspects) {
    aspectedBodies.add(a.body_a);
    aspectedBodies.add(a.body_b);
  }
  const unaspected = sortedPlanets.filter((p) => !aspectedBodies.has(p.body_key));

  // ── Wheel data ─────────────────────────────────────────────────────────────
  const wheelPositions: WheelPosition[] = allLatestPositions.map((p) => ({
    bodyKey: p.body_key,
    degreeDecimal: p.degree_decimal,
    retrograde: p.retrograde,
  }));
  const wheelAspects: WheelAspect[] = sortedAspects.map((a) => ({
    bodyA: a.body_a,
    bodyB: a.body_b,
    aspectKey: a.aspect_key,
    orbDecimal: a.orb_decimal,
  }));

  // ── House system label ─────────────────────────────────────────────────────
  const hsKey = HOUSE_SYSTEM_KEYS[chart.house_system];
  const houseSystemLabel = hsKey
    ? tChart(hsKey as Parameters<typeof tChart>[0])
    : chart.house_system;

  const initial = (chart.person_name ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
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
        <View style={[styles.navRow, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
          <TouchableOpacity
            style={styles.navLink}
            onPress={() => goBackTo(returnTo, routes.tabs.charts)}
          >
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            <Text style={styles.navLinkTextMuted}>{backLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => openChartEdit(chartId)}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={styles.navLinkText}>{tChart('editChart')}</Text>
          </TouchableOpacity>
        </View>
        {/* ── Person hero card ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Avatar + identity */}
          <View style={styles.heroRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColors.bg }]}>
              <Text style={[styles.avatarText, { color: avatarColors.text }]}>{initial}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.personName}>{chart.person_name}</Text>
              <Text style={styles.chartLabel}>{chart.label}</Text>
              <Text style={styles.subjectTypeBadge}>
                {subjectTypeLabels[chart.subject_type] ?? chart.subject_type}
              </Text>
              {/* Big three */}
              {sunSign || moonSign || ascSign ? (
                <View style={styles.bigThreeRow}>
                  {sunSign ? (
                    <View style={[styles.bigThreeBadge, styles.sunBadge]}>
                      <Text style={[styles.bigThreeText, styles.sunText]}>☉ {sunSign}</Text>
                    </View>
                  ) : null}
                  {moonSign ? (
                    <View style={[styles.bigThreeBadge, styles.moonBadge]}>
                      <Text style={[styles.bigThreeText, styles.moonText]}>☽ {moonSign}</Text>
                    </View>
                  ) : null}
                  {ascSign ? (
                    <View style={[styles.bigThreeBadge, styles.ascBadge]}>
                      <Text style={[styles.bigThreeText, styles.ascText]}>↑ {ascSign}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          {/* Birth details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{tChart('birthDateLabel')}</Text>
              <Text style={styles.detailValue}>
                {chart.birth_date}
                {chart.birth_time_known && chart.birth_time
                  ? ` · ${chart.birth_time}`
                  : ` · ${tChart('birthTimeUnknown')}`}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{tChart('birthPlaceLabel')}</Text>
              <Text style={styles.detailValue}>
                {chart.city}, {chart.country}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{tChart('houseSystemLabel')}</Text>
              <Text style={styles.detailValue}>{houseSystemLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, chart.status !== 'ready' && styles.primaryButtonDisabled]}
            onPress={() => setShowReadingModal(true)}
            disabled={chart.status !== 'ready'}
          >
            <Text style={styles.primaryButtonText}>{tCreateReading('submit')}</Text>
          </TouchableOpacity>
          {chart.status !== 'ready' && (
            <Text style={styles.notReadyHint}>{tChart('createReadingNotReady')}</Text>
          )}
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => openCompatibilityNew(routes.charts.detail(chartId), chartId)}
          >
            <Ionicons name="link-outline" size={16} color={colors.primary} />
            <Text style={styles.outlineButtonText}>{tChart('compareWithChart')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Status banners ───────────────────────────────────────────────── */}
        {chart.status === 'pending' ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>{tChart('statusPendingBannerTitle')}</Text>
            <Text style={styles.infoBannerDesc}>{tChart('statusPendingBannerDesc')}</Text>
          </View>
        ) : chart.status === 'error' ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerTitle}>{tChart('statusErrorBannerTitle')}</Text>
            <Text style={styles.errorBannerDesc}>{tChart('statusErrorBannerDesc')}</Text>
          </View>
        ) : null}

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        {chart.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>{tChart('notesLabel')}</Text>
            <Text style={styles.notesText}>{chart.notes}</Text>
          </View>
        ) : null}

        {/* ── Chart wheel ──────────────────────────────────────────────────── */}
        {wheelPositions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tChart('chartWheel')}</Text>
            <View style={styles.wheelContainer}>
              <ChartWheel
                positions={wheelPositions}
                aspects={wheelAspects}
                houseSystem={chart.house_system}
              />
            </View>
          </View>
        ) : null}

        {/* ── Chart Stats ──────────────────────────────────────────────────── */}
        {balancePlanets.length > 0 ? (
          <View style={styles.statsSection}>
            {/* Elements + Modalities side by side */}
            <View style={styles.statsRow}>
              {/* Elements */}
              <View style={styles.statCard}>
                <Text style={styles.statCardTitle}>{tChart('elementsTitle')}</Text>
                {(
                  [
                    { key: 'fire' as const, dot: '#F97316' },
                    { key: 'earth' as const, dot: '#059669' },
                    { key: 'air' as const, dot: '#38BDF8' },
                    { key: 'water' as const, dot: '#3B82F6' },
                  ] as const
                ).map((el) => {
                  const count = elementCounts[el.key];
                  return (
                    <View key={el.key} style={styles.statRow}>
                      <Text style={styles.statLabel}>{elementLabels[el.key] ?? el.key}</Text>
                      <View style={styles.dotRow}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              { backgroundColor: i < count ? el.dot : colors.muted },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.statCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Modalities */}
              <View style={styles.statCard}>
                <Text style={styles.statCardTitle}>{tChart('modalitiesTitle')}</Text>
                {(
                  [
                    { key: 'cardinal' as const, dot: colors.primary },
                    { key: 'fixed' as const, dot: '#A855F7' },
                    { key: 'mutable' as const, dot: '#10B981' },
                  ] as const
                ).map((mod) => {
                  const count = modalityCounts[mod.key];
                  return (
                    <View key={mod.key} style={styles.statRow}>
                      <Text style={styles.statLabel}>{modalityLabels[mod.key] ?? mod.key}</Text>
                      <View style={styles.dotRow}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              { backgroundColor: i < count ? mod.dot : colors.muted },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.statCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* About Chart */}
            <View style={styles.statCard}>
              <Text style={styles.statCardTitle}>{tChart('aboutChart')}</Text>
              {chartRulerPos && chartRulerKey ? (
                <View style={styles.aboutRow}>
                  <View
                    style={[
                      styles.aboutIcon,
                      {
                        backgroundColor:
                          (PLANET_COLORS_HEX[chartRulerKey] ?? colors.primary) + '22',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aboutIconText,
                        { color: PLANET_COLORS_HEX[chartRulerKey] ?? colors.primary },
                      ]}
                    >
                      {PLANET_SYMBOLS[chartRulerKey] ?? chartRulerKey.slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.aboutInfo}>
                    <Text style={styles.aboutMeta}>{tChart('chartRuler')}</Text>
                    <Text style={styles.aboutValue}>
                      {planetLabels[chartRulerKey] ?? chartRulerKey}
                      {chartRulerPos.sign_key ? (
                        <Text style={styles.aboutValueMuted}>
                          {' '}
                          {tChart('inSign')}{' '}
                          {signLabels[chartRulerPos.sign_key] ?? chartRulerPos.sign_key}
                        </Text>
                      ) : null}
                    </Text>
                    {chartRulerPos.house_number != null ? (
                      <Text style={styles.aboutMeta}>
                        {tChart('houseLabel', { number: chartRulerPos.house_number })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {hasTimeData ? (
                <View style={styles.aboutRow}>
                  <View
                    style={[styles.aboutIcon, { backgroundColor: isDay ? '#FEF3C7' : '#E0F2FE' }]}
                  >
                    <Text style={styles.aboutIconText}>{isDay ? '☀' : '☽'}</Text>
                  </View>
                  <View style={styles.aboutInfo}>
                    <Text style={styles.aboutMeta}>{tChart('chartType')}</Text>
                    <Text style={styles.aboutValue}>
                      {isDay ? tChart('dayChart') : tChart('nightChart')}
                    </Text>
                    <Text style={styles.aboutMeta}>
                      {isDay ? tChart('dayChartDesc') : tChart('nightChartDesc')}
                    </Text>
                  </View>
                </View>
              ) : null}
              {!chartRulerPos && !hasTimeData ? (
                <Text style={styles.aboutHint}>{tChart('addLocationHint')}</Text>
              ) : null}
            </View>

            {/* Polarity */}
            <View style={styles.statCard}>
              <Text style={styles.statCardTitle}>{tChart('polarityTitle')}</Text>
              <Text style={styles.statCardDesc}>{tChart('polarityDesc')}</Text>
              {(['masculine', 'feminine'] as const).map((pol) => {
                const count = polarityCounts[pol];
                return (
                  <View key={pol} style={styles.statRow}>
                    <Text style={styles.statLabel}>{polarityLabels[pol] ?? pol}</Text>
                    <View style={styles.dotRow}>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                i < count
                                  ? pol === 'masculine'
                                    ? '#F97316'
                                    : '#6366F1'
                                  : colors.muted,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.statCount}>{count}</Text>
                  </View>
                );
              })}
            </View>

            {/* Stelliums */}
            <View style={styles.statCard}>
              <Text style={styles.statCardTitle}>{tChart('stelliumsTitle')}</Text>
              <Text style={styles.statCardDesc}>{tChart('stelliumsDesc')}</Text>
              {signStelliums.length === 0 && houseStelliums.length === 0 ? (
                <Text style={styles.statEmptyText}>{tChart('noStelliums')}</Text>
              ) : (
                <>
                  {signStelliums.map(([sign, bodies]) => (
                    <View key={`s-${sign}`} style={styles.stelliumItem}>
                      <Text style={styles.stelliumTitle}>
                        {tChart('stelliumSign', { sign: signLabels[sign] ?? sign })}
                      </Text>
                      <Text style={styles.stelliumBodies}>
                        {bodies.map((b) => planetLabels[b] ?? b).join(', ')}
                      </Text>
                    </View>
                  ))}
                  {houseStelliums.map(([house, bodies]) => (
                    <View key={`h-${house}`} style={styles.stelliumItem}>
                      <Text style={styles.stelliumTitle}>{tChart('stelliumHouse', { house })}</Text>
                      <Text style={styles.stelliumBodies}>
                        {bodies.map((b) => planetLabels[b] ?? b).join(', ')}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Dignities */}
            {dignities.length > 0 ? (
              <View style={styles.statCard}>
                <Text style={styles.statCardTitle}>{tChart('dignityTitle')}</Text>
                <Text style={styles.statCardDesc}>{tChart('dignityDesc')}</Text>
                {dignities.map((d) => {
                  const dc = DIGNITY_COLORS[d.dignity!];
                  return (
                    <View key={d.body} style={[styles.dignityRow, { backgroundColor: dc.bg }]}>
                      <Text
                        style={[
                          styles.dignitySymbol,
                          { color: PLANET_COLORS_HEX[d.body] ?? dc.text },
                        ]}
                      >
                        {PLANET_SYMBOLS[d.body] ?? d.body.slice(0, 2)}
                      </Text>
                      <Text style={[styles.dignityPlanet, { color: dc.text }]}>
                        {planetLabels[d.body] ?? d.body}
                      </Text>
                      <Text style={[styles.dignityType, { color: dc.text }]}>
                        {dignityLabels[d.dignity!] ?? d.dignity}
                      </Text>
                      <Text style={[styles.dignityShort, { color: dc.text }]}>
                        {dignityShortLabels[d.dignity!] ?? ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Unaspected planets */}
            {unaspected.length > 0 ? (
              <View style={styles.statCard}>
                <Text style={styles.statCardTitle}>{tChart('unaspectedTitle')}</Text>
                <Text style={styles.statCardDesc}>{tChart('unaspectedDesc')}</Text>
                {unaspected.map((p) => (
                  <View key={p.id} style={styles.unaspectedRow}>
                    <Text
                      style={[
                        styles.dignitySymbol,
                        { color: PLANET_COLORS_HEX[p.body_key] ?? colors.mutedForeground },
                      ]}
                    >
                      {PLANET_SYMBOLS[p.body_key] ?? p.body_key.slice(0, 2)}
                    </Text>
                    <Text style={styles.unaspectedPlanet}>
                      {planetLabels[p.body_key] ?? p.body_key}
                    </Text>
                    <Text style={styles.unaspectedSign}>
                      {signLabels[p.sign_key] ?? p.sign_key}
                      {p.house_number != null
                        ? ` · ${tChart('houseLabel', { number: p.house_number })}`
                        : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Positions ────────────────────────────────────────────────────── */}
        {sortedPlanets.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tChart('positions')}</Text>
            {sortedPlanets.map((pos) => {
              const symbol = PLANET_SYMBOLS[pos.body_key] ?? pos.body_key.slice(0, 2).toUpperCase();
              const planetColor = PLANET_COLORS_HEX[pos.body_key] ?? colors.mutedForeground;
              const planetName = planetLabels[pos.body_key] ?? pos.body_key;
              const signName = signLabels[pos.sign_key] ?? pos.sign_key;
              const meaning = planetMeanings[pos.body_key] ?? '';
              const keyword = signKeywords[pos.sign_key] ?? '';
              const dignity = getDignity(pos.body_key, pos.sign_key);
              const dignityStyle = dignity ? DIGNITY_COLORS[dignity] : null;

              return (
                <View key={pos.id} style={styles.positionRow}>
                  <View style={[styles.planetSymbol, { backgroundColor: planetColor + '22' }]}>
                    <Text style={[styles.planetSymbolText, { color: planetColor }]}>{symbol}</Text>
                  </View>
                  <View style={styles.positionInfo}>
                    <View style={styles.positionNameRow}>
                      <Text style={styles.positionPlanetName}>{planetName}</Text>
                      {pos.retrograde ? (
                        <View style={styles.rxBadge}>
                          <Text style={styles.rxBadgeText}>Rx</Text>
                        </View>
                      ) : null}
                      {meaning ? (
                        <Text style={styles.positionMeaning} numberOfLines={1}>
                          {meaning}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.positionSignRow}>
                      <Text style={styles.positionSign}>
                        {signName} {formatDeg(pos.degree_decimal)}
                      </Text>
                      {pos.house_number != null ? (
                        <Text style={styles.positionHouse}>
                          · {tChart('houseLabel', { number: pos.house_number })}
                        </Text>
                      ) : null}
                      {dignityStyle ? (
                        <View style={[styles.dignityBadge, { backgroundColor: dignityStyle.bg }]}>
                          <Text style={[styles.dignityBadgeText, { color: dignityStyle.text }]}>
                            {dignityLabels[dignity!] ?? dignity}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {keyword ? (
                      <Text style={styles.positionKeyword} numberOfLines={1}>
                        {keyword}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {/* Angles strip */}
            {angles.length > 0 ? (
              <View style={styles.anglesStrip}>
                {angles.map((pos) => {
                  const isAsc = pos.body_key === 'ascendant';
                  const signName = signLabels[pos.sign_key] ?? pos.sign_key;
                  const label = isAsc ? tChart('ascendantLabel') : tChart('midheavenLabel');
                  // Short display label
                  const shortLabel = isAsc ? 'AC' : 'MC';
                  return (
                    <View key={pos.id} style={styles.angleRow}>
                      <View style={[styles.planetSymbol, { backgroundColor: colors.primaryTint }]}>
                        <Text style={[styles.planetSymbolText, { color: colors.primary }]}>
                          {shortLabel}
                        </Text>
                      </View>
                      <View style={styles.positionInfo}>
                        <Text style={styles.positionPlanetName} numberOfLines={1}>
                          {label}
                        </Text>
                        <Text style={styles.positionSign}>
                          {signName} {formatDeg(pos.degree_decimal)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Aspects ──────────────────────────────────────────────────────── */}
        {sortedAspects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tChart('aspects')}</Text>
            {sortedAspects.map((asp) => {
              const symbol = ASPECT_SYMBOLS[asp.aspect_key] ?? asp.aspect_key;
              const aspectColor = ASPECT_COLORS_HEX[asp.aspect_key] ?? colors.mutedForeground;
              const aspectName = aspectNames[asp.aspect_key] ?? asp.aspect_key;
              const planetA = planetLabels[asp.body_a] ?? asp.body_a;
              const planetB = planetLabels[asp.body_b] ?? asp.body_b;
              return (
                <View key={asp.id} style={styles.aspectRow}>
                  <View style={[styles.aspectSymbolBox, { backgroundColor: aspectColor + '18' }]}>
                    <Text style={[styles.aspectSymbol, { color: aspectColor }]}>{symbol}</Text>
                  </View>
                  <View style={styles.aspectInfo}>
                    <Text style={styles.aspectPlanets}>
                      {planetA} · {planetB}
                    </Text>
                    <Text style={styles.aspectMeta}>
                      {aspectName} · {asp.orb_decimal.toFixed(1)}° {tChart('orbSuffix')}
                      {asp.applying != null
                        ? ` · ${asp.applying ? tChart('applying') : tChart('separating')}`
                        : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── Linked readings ──────────────────────────────────────────────── */}
        <View
          style={styles.section}
          onLayout={(e) => {
            readingsSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>{tChart('linkedReadings')}</Text>
          {linkedReadings.length === 0 && !readingsLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{tChart('noReadingsYet')}</Text>
              <Text style={styles.emptyStateHint}>{tChart('noReadingsHint')}</Text>
            </View>
          ) : (
            <View style={readingsLoading ? { opacity: 0.5, gap: 8 } : { gap: 8 }}>
              {linkedReadings.map((r) => {
                const readingTypeLabel =
                  (m.chartDetail.readingTypes as Record<string, string>)[r.reading_type] ??
                  r.reading_type.replace(/_/g, ' ');
                const dateStr = new Date(r.created_at).toLocaleDateString('ru-RU');
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.readingCard}
                    onPress={() => openReadingDetail(r.id, routes.charts.detail(chartId))}
                  >
                    <View style={styles.readingCardRow}>
                      <View style={styles.readingCardLeft}>
                        <Text style={styles.readingCardTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                        <Text style={styles.readingCardMeta}>
                          {readingTypeLabel} · {dateStr}
                        </Text>
                        {r.summary ? (
                          <Text style={styles.readingCardSub} numberOfLines={2}>
                            {r.summary}
                          </Text>
                        ) : null}
                      </View>
                      {r.status !== 'ready' ? (
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: readingStatusColors[r.status] ?? '#6b7280' },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            {readingStatusLabels[r.status] ?? r.status}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Pagination */}
              {Math.ceil(readingsTotal / PAGE_SIZE) > 1 ? (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[
                      styles.pageBtn,
                      (readingsPage <= 1 || readingsLoading) && styles.pageBtnDisabled,
                    ]}
                    onPress={() => loadReadingsPage(readingsPage - 1)}
                    disabled={readingsPage <= 1 || readingsLoading}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={readingsPage <= 1 ? colors.mutedForeground : colors.foreground}
                    />
                  </TouchableOpacity>
                  {readingsLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ marginHorizontal: 8 }}
                    />
                  ) : (
                    <Text style={styles.pageLabel}>
                      {tChart('pageLabel', {
                        current: readingsPage,
                        total: Math.ceil(readingsTotal / PAGE_SIZE),
                      })}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.pageBtn,
                      (readingsPage >= Math.ceil(readingsTotal / PAGE_SIZE) || readingsLoading) &&
                        styles.pageBtnDisabled,
                    ]}
                    onPress={() => loadReadingsPage(readingsPage + 1)}
                    disabled={
                      readingsPage >= Math.ceil(readingsTotal / PAGE_SIZE) || readingsLoading
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={
                        readingsPage >= Math.ceil(readingsTotal / PAGE_SIZE)
                          ? colors.mutedForeground
                          : colors.foreground
                      }
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Reading type bottom sheet ─────────────────────────────────────── */}
      <Modal
        visible={showReadingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReadingModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReadingModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{tCreateReading('submit')}</Text>
            {READING_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalItem}
                onPress={() => handleCreateReading(type)}
                disabled={creatingReading !== null}
              >
                {creatingReading === type ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.modalItemText}>{readingTypeLabels[type] ?? type}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowReadingModal(false)}>
              <Text style={styles.modalCancelText}>{tCommon('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 56,
      gap: 12,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 12,
    },

    // ── Nav row ──────────────────────────────────────────────────────────────────
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    navLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    navLinkText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    navLinkTextMuted: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontWeight: '500',
    },

    // ── Hero card ─────────────────────────────────────────────────────────────────
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      ...cardShadow,
    },
    heroRow: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarText: {
      fontSize: 22,
      fontWeight: '700',
    },
    heroInfo: {
      flex: 1,
      gap: 2,
    },
    personName: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    chartLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    subjectTypeBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 2,
    },
    bigThreeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 6,
    },
    bigThreeBadge: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    bigThreeText: {
      fontSize: 11,
      fontWeight: '500',
    },
    sunBadge: { backgroundColor: '#FEF3C7' },
    sunText: { color: '#92400E' },
    moonBadge: { backgroundColor: '#E0F2FE' },
    moonText: { color: '#075985' },
    ascBadge: { backgroundColor: '#EEF2FF' },
    ascText: { color: '#4338CA' },

    // Birth details grid
    detailsGrid: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
      gap: 10,
    },
    detailItem: {
      gap: 2,
    },
    detailLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.mutedForeground,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
    },

    // ── Actions ───────────────────────────────────────────────────────────────────
    actionsGroup: {
      gap: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    notReadyHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      height: 44,
      backgroundColor: colors.card,
    },
    outlineButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },

    // ── Status banners ────────────────────────────────────────────────────────────
    infoBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '50',
      backgroundColor: colors.primarySubtle,
      padding: 14,
      gap: 4,
    },
    infoBannerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    infoBannerDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    errorBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.destructive + '50',
      backgroundColor: colors.destructiveSubtle,
      padding: 14,
      gap: 4,
    },
    errorBannerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.destructive,
    },
    errorBannerDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
    },

    // ── Notes ─────────────────────────────────────────────────────────────────────
    notesBlock: {
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    notesLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.mutedForeground,
    },
    notesText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 20,
    },

    // ── Section ───────────────────────────────────────────────────────────────────
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },

    // ── Chart wheel ───────────────────────────────────────────────────────────────
    wheelContainer: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      ...cardShadow,
    },

    // ── Stats section (all stat cards) ───────────────────────────────────────────
    statsSection: {
      gap: 10,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
      ...cardShadow,
    },
    statCardTitle: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      width: 55,
      flexShrink: 0,
    },
    dotRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 2,
      alignItems: 'center',
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
      width: 14,
      textAlign: 'right',
    },
    statCardDesc: {
      fontSize: 10,
      color: colors.mutedForeground + 'AA',
      marginTop: -4,
      marginBottom: 4,
      lineHeight: 14,
    },
    statEmptyText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      lineHeight: 18,
    },

    // ── About Chart ──────────────────────────────────────────────────────────────
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 6,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    aboutIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    aboutIconText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    aboutInfo: {
      flex: 1,
      gap: 2,
    },
    aboutMeta: {
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 16,
    },
    aboutValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    aboutValueMuted: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.mutedForeground,
    },
    aboutHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      marginTop: 6,
    },

    // ── Stelliums ─────────────────────────────────────────────────────────────────
    stelliumItem: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
      marginTop: 4,
    },
    stelliumTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    stelliumBodies: {
      fontSize: 11,
      color: colors.mutedForeground,
    },

    // ── Dignities ─────────────────────────────────────────────────────────────────
    dignityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 4,
    },
    dignitySymbol: {
      fontSize: 15,
      fontWeight: '600',
      width: 22,
      textAlign: 'center',
    },
    dignityPlanet: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    dignityType: {
      fontSize: 11,
      fontWeight: '500',
    },
    dignityShort: {
      fontSize: 10,
      opacity: 0.7,
    },

    // ── Unaspected ────────────────────────────────────────────────────────────────
    unaspectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.muted,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 4,
    },
    unaspectedPlanet: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    unaspectedSign: {
      fontSize: 11,
      color: colors.mutedForeground,
    },

    // ── Positions ─────────────────────────────────────────────────────────────────
    positionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    anglesStrip: {
      gap: 8,
      marginTop: 4,
    },
    angleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 12,
    },
    planetSymbol: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    planetSymbolText: {
      fontSize: 15,
      fontWeight: '600',
    },
    positionInfo: {
      flex: 1,
      gap: 2,
    },
    positionNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    positionPlanetName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    positionMeaning: {
      fontSize: 11,
      color: colors.mutedForeground,
      flex: 1,
    },
    rxBadge: {
      backgroundColor: '#FFEDD5',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    rxBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#C2410C',
    },
    positionSignRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    positionSign: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '500',
    },
    positionHouse: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    positionKeyword: {
      fontSize: 11,
      color: colors.mutedForeground + 'AA',
      fontStyle: 'italic',
    },
    dignityBadge: {
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    dignityBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },

    // ── Aspects ───────────────────────────────────────────────────────────────────
    aspectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    aspectSymbolBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    aspectSymbol: {
      fontSize: 16,
      fontWeight: '600',
    },
    aspectInfo: {
      flex: 1,
      gap: 2,
    },
    aspectPlanets: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    aspectMeta: {
      fontSize: 12,
      color: colors.mutedForeground,
    },

    // ── Reading cards ─────────────────────────────────────────────────────────────
    readingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      ...cardShadow,
    },
    readingCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    readingCardLeft: {
      flex: 1,
      gap: 2,
    },
    readingCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    readingCardMeta: {
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'capitalize',
    },
    readingCardSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      lineHeight: 17,
    },

    // ── Pagination ────────────────────────────────────────────────────────────────
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    pageBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageBtnDisabled: {
      opacity: 0.4,
    },
    pageLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.mutedForeground,
      paddingHorizontal: 10,
    },

    // ── Empty state hint ──────────────────────────────────────────────────────────
    emptyStateHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 4,
    },
    statusChip: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 8,
    },
    statusChipText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },

    // ── Empty state ───────────────────────────────────────────────────────────────
    emptyState: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },

    // ── Fallback state ───────────────────────────────────────────────────────────
    fallbackTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
    },
    fallbackDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 320,
    },
    fallbackActions: {
      width: '100%',
      maxWidth: 320,
      gap: 10,
      marginTop: 4,
    },
    fallbackPrimaryButton: {
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },
    fallbackPrimaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    fallbackSecondaryButton: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackSecondaryButtonText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },

    // ── Modal bottom sheet ────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      gap: 4,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    modalItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'flex-start',
    },
    modalItemText: {
      fontSize: 15,
      color: colors.foreground,
    },
    modalCancel: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    modalCancelText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontWeight: '500',
    },
  });
}
