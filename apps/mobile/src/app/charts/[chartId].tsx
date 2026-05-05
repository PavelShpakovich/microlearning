import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  goBackTo,
  openChartEdit,
  openCompatibilityNew,
  openReadingDetail,
  replaceWithReadingDetail,
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
import { DetailNotFoundState } from '@/components/DetailNotFoundState';
import { ChartAspectsSection } from '@/components/charts/ChartAspectsSection';
import { ChartDetailHeroSection } from '@/components/charts/ChartDetailHeroSection';
import { ChartLinkedReadingsSection } from '@/components/charts/ChartLinkedReadingsSection';
import { ChartNotesSection } from '@/components/charts/ChartNotesSection';
import { ChartPositionsSection } from '@/components/charts/ChartPositionsSection';
import { ChartReadingTypeSheet } from '@/components/charts/ChartReadingTypeSheet';
import { ChartStatsSection } from '@/components/charts/ChartStatsSection';
import { ChartWheelSection } from '@/components/charts/ChartWheelSection';
import type { WheelPosition, WheelAspect } from '@/components/ChartWheel';
import { Skeleton } from '@/components/Skeleton';
import { ApiClientError } from '@clario/api-client';
import { useInsufficientCredits } from '@/lib/insufficient-credits-context';
import { usePullToRefresh } from '@/lib/refresh';
import { useCreditSpendConfirm } from '@/hooks/useCreditSpendConfirm';

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
  const { confirmSpend: confirmReadingSpend } = useCreditSpendConfirm('natal_report');

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
    setShowReadingModal(false);
    const ok = await confirmReadingSpend();
    if (!ok) {
      setShowReadingModal(true);
      return;
    }

    setCreatingReading(readingType);
    try {
      await runToastMutation({
        action: () => readingsApi.createReading({ chartId, readingType, locale: getLocale() }),
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
        onSuccess: async ({ reading }) => {
          setShowReadingModal(false);
          replaceWithReadingDetail(reading.id);
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
      <DetailNotFoundState
        iconName="planet-outline"
        title={tChart('notFoundTitle')}
        description={tChart('notFoundDesc')}
        primaryLabel={backLabel}
        onPrimaryPress={() => goBackTo(returnTo, routes.tabs.charts)}
        secondaryLabel={tChart('retryLoad')}
        onSecondaryPress={() => void loadChartDetail(true)}
      />
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

  const positionItems = sortedPlanets.map((pos) => {
    const symbol = PLANET_SYMBOLS[pos.body_key] ?? pos.body_key.slice(0, 2).toUpperCase();
    const symbolColor = PLANET_COLORS_HEX[pos.body_key] ?? colors.mutedForeground;
    const signName = signLabels[pos.sign_key] ?? pos.sign_key;
    const dignity = getDignity(pos.body_key, pos.sign_key);
    const dignityStyle = dignity ? DIGNITY_COLORS[dignity] : null;

    return {
      id: pos.id,
      symbol,
      symbolColor,
      symbolBackgroundColor: `${symbolColor}22`,
      planetName: planetLabels[pos.body_key] ?? pos.body_key,
      retrograde: Boolean(pos.retrograde),
      meaning: planetMeanings[pos.body_key] ?? '',
      signLabel: `${signName} ${formatDeg(pos.degree_decimal)}`,
      houseLabel:
        pos.house_number != null ? tChart('houseLabel', { number: pos.house_number }) : undefined,
      dignityLabel: dignity ? (dignityLabels[dignity] ?? dignity) : undefined,
      dignityBackgroundColor: dignityStyle?.bg,
      dignityTextColor: dignityStyle?.text,
      keyword: signKeywords[pos.sign_key] ?? '',
    };
  });

  const angleItems = angles.map((pos) => {
    const isAsc = pos.body_key === 'ascendant';
    const signName = signLabels[pos.sign_key] ?? pos.sign_key;

    return {
      id: pos.id,
      shortLabel: isAsc ? 'AC' : 'MC',
      label: isAsc ? tChart('ascendantLabel') : tChart('midheavenLabel'),
      signLabel: `${signName} ${formatDeg(pos.degree_decimal)}`,
    };
  });

  const elementRows = (
    [
      { key: 'fire' as const, dot: '#F97316' },
      { key: 'earth' as const, dot: '#059669' },
      { key: 'air' as const, dot: '#38BDF8' },
      { key: 'water' as const, dot: '#3B82F6' },
    ] as const
  ).map((row) => ({
    id: row.key,
    label: elementLabels[row.key] ?? row.key,
    count: elementCounts[row.key],
    activeColor: row.dot,
  }));

  const modalityRows = (
    [
      { key: 'cardinal' as const, dot: colors.primary },
      { key: 'fixed' as const, dot: '#A855F7' },
      { key: 'mutable' as const, dot: '#10B981' },
    ] as const
  ).map((row) => ({
    id: row.key,
    label: modalityLabels[row.key] ?? row.key,
    count: modalityCounts[row.key],
    activeColor: row.dot,
  }));

  const aboutItems = [
    chartRulerPos && chartRulerKey
      ? {
          id: 'chart-ruler',
          iconText: PLANET_SYMBOLS[chartRulerKey] ?? chartRulerKey.slice(0, 2),
          iconTextColor: PLANET_COLORS_HEX[chartRulerKey] ?? colors.primary,
          iconBackgroundColor: `${PLANET_COLORS_HEX[chartRulerKey] ?? colors.primary}22`,
          meta: tChart('chartRuler'),
          value: planetLabels[chartRulerKey] ?? chartRulerKey,
          valueMuted: chartRulerPos.sign_key
            ? `${tChart('inSign')} ${signLabels[chartRulerPos.sign_key] ?? chartRulerPos.sign_key}`
            : undefined,
          secondaryMeta:
            chartRulerPos.house_number != null
              ? tChart('houseLabel', { number: chartRulerPos.house_number })
              : undefined,
        }
      : null,
    hasTimeData
      ? {
          id: 'chart-type',
          iconText: isDay ? '☀' : '☽',
          iconTextColor: colors.primary,
          iconBackgroundColor: isDay ? '#FEF3C7' : '#E0F2FE',
          meta: tChart('chartType'),
          value: isDay ? tChart('dayChart') : tChart('nightChart'),
          secondaryMeta: isDay ? tChart('dayChartDesc') : tChart('nightChartDesc'),
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    iconText: string;
    iconTextColor: string;
    iconBackgroundColor: string;
    meta: string;
    value: string;
    valueMuted?: string;
    secondaryMeta?: string;
  }>;

  const polarityRows = (['masculine', 'feminine'] as const).map((row) => ({
    id: row,
    label: polarityLabels[row] ?? row,
    count: polarityCounts[row],
    activeColor: row === 'masculine' ? '#F97316' : '#6366F1',
  }));

  const stelliumItems = [
    ...signStelliums.map(([sign, bodies]) => ({
      id: `s-${sign}`,
      title: tChart('stelliumSign', { sign: signLabels[sign] ?? sign }),
      bodies: bodies.map((body) => planetLabels[body] ?? body).join(', '),
    })),
    ...houseStelliums.map(([house, bodies]) => ({
      id: `h-${house}`,
      title: tChart('stelliumHouse', { house }),
      bodies: bodies.map((body) => planetLabels[body] ?? body).join(', '),
    })),
  ];

  const dignityItems = dignities.map((item) => {
    const palette = DIGNITY_COLORS[item.dignity!];

    return {
      id: item.body,
      symbol: PLANET_SYMBOLS[item.body] ?? item.body.slice(0, 2),
      symbolColor: PLANET_COLORS_HEX[item.body] ?? palette.text,
      planet: planetLabels[item.body] ?? item.body,
      type: dignityLabels[item.dignity!] ?? item.dignity!,
      short: dignityShortLabels[item.dignity!] ?? '',
      backgroundColor: palette.bg,
      textColor: palette.text,
    };
  });

  const unaspectedItems = unaspected.map((item) => ({
    id: item.id,
    symbol: PLANET_SYMBOLS[item.body_key] ?? item.body_key.slice(0, 2),
    symbolColor: PLANET_COLORS_HEX[item.body_key] ?? colors.mutedForeground,
    planet: planetLabels[item.body_key] ?? item.body_key,
    sign: `${signLabels[item.sign_key] ?? item.sign_key}${item.house_number != null ? ` · ${tChart('houseLabel', { number: item.house_number })}` : ''}`,
  }));

  const aspectItems = sortedAspects.map((aspect) => {
    const symbolColor = ASPECT_COLORS_HEX[aspect.aspect_key] ?? colors.mutedForeground;
    const aspectName = aspectNames[aspect.aspect_key] ?? aspect.aspect_key;
    const applyingLabel =
      aspect.applying != null
        ? ` · ${aspect.applying ? tChart('applying') : tChart('separating')}`
        : '';

    return {
      id: aspect.id,
      symbol: ASPECT_SYMBOLS[aspect.aspect_key] ?? aspect.aspect_key,
      symbolColor,
      symbolBackgroundColor: `${symbolColor}18`,
      planetsLabel: `${planetLabels[aspect.body_a] ?? aspect.body_a} · ${planetLabels[aspect.body_b] ?? aspect.body_b}`,
      metaLabel: `${aspectName} · ${aspect.orb_decimal.toFixed(1)}° ${tChart('orbSuffix')}${applyingLabel}`,
    };
  });

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
        <ChartDetailHeroSection
          chart={chart}
          initial={initial}
          avatarColors={avatarColors}
          subjectTypeLabel={subjectTypeLabels[chart.subject_type] ?? chart.subject_type}
          sunSign={sunSign}
          moonSign={moonSign}
          ascSign={ascSign}
          birthDateLabel={tChart('birthDateLabel')}
          birthPlaceLabel={tChart('birthPlaceLabel')}
          birthTimeUnknownLabel={tChart('birthTimeUnknown')}
          houseSystemLabel={tChart('houseSystemLabel')}
          houseSystemValue={houseSystemLabel}
          createReadingLabel={tCreateReading('submit')}
          compareWithChartLabel={tChart('compareWithChart')}
          createReadingNotReadyLabel={tChart('createReadingNotReady')}
          statusPendingBannerTitle={tChart('statusPendingBannerTitle')}
          statusPendingBannerDesc={tChart('statusPendingBannerDesc')}
          statusErrorBannerTitle={tChart('statusErrorBannerTitle')}
          statusErrorBannerDesc={tChart('statusErrorBannerDesc')}
          onCreateReadingPress={() => setShowReadingModal(true)}
          onComparePress={() => openCompatibilityNew(routes.charts.detail(chartId), chartId)}
        />

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        {chart.notes ? (
          <ChartNotesSection title={tChart('notesLabel')} notes={chart.notes} />
        ) : null}

        {/* ── Chart wheel ──────────────────────────────────────────────────── */}
        <ChartWheelSection
          title={tChart('chartWheel')}
          positions={wheelPositions}
          aspects={wheelAspects}
          houseSystem={chart.house_system}
        />

        <ChartStatsSection
          elementsTitle={tChart('elementsTitle')}
          elementRows={elementRows}
          modalitiesTitle={tChart('modalitiesTitle')}
          modalityRows={modalityRows}
          aboutChartTitle={tChart('aboutChart')}
          aboutItems={aboutItems}
          aboutHint={tChart('addLocationHint')}
          polarityTitle={tChart('polarityTitle')}
          polarityDesc={tChart('polarityDesc')}
          polarityRows={polarityRows}
          stelliumsTitle={tChart('stelliumsTitle')}
          stelliumsDesc={tChart('stelliumsDesc')}
          noStelliumsLabel={tChart('noStelliums')}
          stelliums={stelliumItems}
          dignityTitle={tChart('dignityTitle')}
          dignityDesc={tChart('dignityDesc')}
          dignities={dignityItems}
          unaspectedTitle={tChart('unaspectedTitle')}
          unaspectedDesc={tChart('unaspectedDesc')}
          unaspected={unaspectedItems}
        />

        {/* ── Positions ────────────────────────────────────────────────────── */}
        <ChartPositionsSection
          title={tChart('positions')}
          positions={positionItems}
          angles={angleItems}
        />

        {/* ── Aspects ──────────────────────────────────────────────────────── */}
        <ChartAspectsSection title={tChart('aspects')} aspects={aspectItems} />

        {/* ── Linked readings ──────────────────────────────────────────────── */}
        <ChartLinkedReadingsSection
          title={tChart('linkedReadings')}
          emptyTitle={tChart('noReadingsYet')}
          emptyHint={tChart('noReadingsHint')}
          readings={linkedReadings}
          readingsLoading={readingsLoading}
          readingsTotal={readingsTotal}
          readingsPage={readingsPage}
          pageSize={PAGE_SIZE}
          readingTypeLabels={m.chartDetail.readingTypes as Record<string, string>}
          readingStatusLabels={readingStatusLabels}
          readingStatusColors={readingStatusColors}
          onPressReading={(readingId) =>
            openReadingDetail(readingId, routes.charts.detail(chartId))
          }
          onPageChange={loadReadingsPage}
          onSectionLayout={(y) => {
            readingsSectionY.current = y;
          }}
          getPageLabel={(current, total) => tChart('pageLabel', { current, total })}
        />
      </ScrollView>

      <ChartReadingTypeSheet
        visible={showReadingModal}
        title={tCreateReading('submit')}
        cancelLabel={tCommon('cancel')}
        readingTypes={READING_TYPES}
        readingTypeLabels={readingTypeLabels}
        creatingReading={creatingReading}
        onSelectType={handleCreateReading}
        onClose={() => setShowReadingModal(false)}
      />
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

    // ── Section ───────────────────────────────────────────────────────────────────
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
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
  });
}
