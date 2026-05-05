import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { goBackTo, openChartDetail, routes } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { compatibilityApi } from '@clario/api-client';
import type { CompatibilityReport } from '@clario/api-client';
import { useTranslations, getLocale } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { allMessages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { SCREEN_TOP_INSET_OFFSET } from '@/lib/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleReadyNotification } from '@/lib/notifications';
import { DetailErrorBanner } from '@/components/DetailErrorBanner';
import { DetailNotFoundState } from '@/components/DetailNotFoundState';
import { Skeleton } from '@/components/Skeleton';
import { useGenerationPolling } from '@/hooks/useGenerationPolling';
import { useGenerationStepTicker } from '@/hooks/useGenerationStepTicker';
import { usePullToRefresh } from '@/lib/refresh';

type CompatType = 'romantic' | 'friendship' | 'business' | 'family';

function CompatibilityDetailSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.topBar, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <View style={styles.backButton}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width={84} height={13} />
        </View>
        <View style={styles.chartLinks}>
          <Skeleton width={96} height={30} borderRadius={8} />
          <Skeleton width={96} height={30} borderRadius={8} />
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Skeleton width={84} height={10} />
        <Skeleton width={'72%'} height={28} style={{ marginTop: 4 }} />
        <View style={styles.metaRow}>
          <Skeleton width={120} height={12} />
          <Skeleton width={72} height={22} borderRadius={11} />
        </View>
      </View>

      <View style={styles.harmonyCard}>
        <View style={styles.personPairRow}>
          <View style={styles.personCell}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.personInfo}>
              <Skeleton width={78} height={13} />
              <Skeleton width={58} height={10} style={{ marginTop: 4 }} />
            </View>
          </View>
          <Skeleton width={16} height={16} borderRadius={8} />
          <View style={[styles.personCell, styles.personCellRight]}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={[styles.personInfo, styles.personInfoRight]}>
              <Skeleton width={78} height={13} />
              <Skeleton width={58} height={10} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>

        <View style={styles.gaugeSection}>
          <Skeleton width={92} height={10} />
          <Skeleton width={'100%'} height={150} borderRadius={18} />
          <View style={styles.scoreRow}>
            <Skeleton width={72} height={48} />
            <Skeleton width={56} height={12} />
          </View>
          <Skeleton width={110} height={28} borderRadius={14} />
          <Skeleton width={'82%'} height={13} />
        </View>

        <View style={styles.infoBoxes}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.infoBox}>
              <Skeleton width={96} height={10} />
              <Skeleton width={'92%'} height={12} style={{ marginTop: 6 }} />
              <Skeleton width={'75%'} height={12} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Skeleton width={'96%'} height={14} />
        <Skeleton width={'88%'} height={14} style={{ marginTop: 10 }} />
        <Skeleton width={'92%'} height={14} style={{ marginTop: 10 }} />
      </View>

      <View style={styles.sectionBlock}>
        <Skeleton width={108} height={10} style={{ marginBottom: 10 }} />
        {[0, 1].map((index) => (
          <View key={index} style={styles.aspectCard}>
            <View style={styles.aspectHeader}>
              <Skeleton width={110} height={12} />
              <Skeleton width={58} height={10} />
            </View>
            <Skeleton width={'70%'} height={13} style={{ marginTop: 4 }} />
            <Skeleton width={'96%'} height={12} style={{ marginTop: 8 }} />
            <Skeleton width={'82%'} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      <View style={styles.sectionsBlock}>
        {[0, 1].map((index) => (
          <View key={index} style={styles.sectionItem}>
            <View style={styles.sectionHeader}>
              <Skeleton width={28} height={28} borderRadius={14} />
              <Skeleton width={160} height={18} />
            </View>
            <View style={styles.sectionBody}>
              <Skeleton width={'96%'} height={13} />
              <Skeleton width={'100%'} height={13} style={{ marginTop: 10 }} />
              <Skeleton width={'84%'} height={13} style={{ marginTop: 10 }} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function getHarmonyColors(score: number): { accent: string; softAccent: string } {
  if (score >= 80) return { accent: '#0f9f76', softAccent: 'rgba(16,185,129,0.14)' };
  if (score >= 65) return { accent: '#15a34a', softAccent: 'rgba(34,197,94,0.14)' };
  if (score >= 45) return { accent: '#d97706', softAccent: 'rgba(245,158,11,0.16)' };
  if (score >= 25) return { accent: '#ea580c', softAccent: 'rgba(249,115,22,0.16)' };
  return { accent: '#e11d48', softAccent: 'rgba(244,63,94,0.16)' };
}

// ─── Speedometer gauge (SVG) ────────────────────────────────────────────────

interface GaugeProps {
  score: number;
  accent: string;
}

function SpeedometerGauge({ score, accent }: GaugeProps) {
  const colors = useColors();
  const cx = 130,
    cy = 130,
    r = 90,
    sw = 12;
  const clamped = Math.max(0, Math.min(100, score));

  function pt(deg: number, radius = r) {
    return {
      x: cx + radius * Math.cos((deg * Math.PI) / 180),
      y: cy - radius * Math.sin((deg * Math.PI) / 180),
    };
  }

  function arc(startDeg: number, endDeg: number, radius = r) {
    const s = pt(startDeg, radius);
    const e = pt(endDeg, radius);
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${radius} ${radius} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }

  const fullArc = arc(180, 0);
  const needleDeg = 180 - (clamped / 100) * 180;
  const needleTip = pt(needleDeg, r - 20);
  const marker = pt(needleDeg, r);
  const activeArc = clamped > 0 ? arc(180, needleDeg) : null;

  const zones = [
    { start: 180, end: 120, color: '#fb7185' },
    { start: 120, end: 60, color: '#f59e0b' },
    { start: 60, end: 0, color: '#10b981' },
  ];

  return (
    <Svg viewBox="0 0 260 160" width="100%" height={150}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#f43f5e" />
          <Stop offset="48%" stopColor="#f59e0b" />
          <Stop offset="100%" stopColor="#10b981" />
        </LinearGradient>
      </Defs>

      {/* Track shadow */}
      <Path
        d={fullArc}
        fill="none"
        stroke="#000"
        strokeWidth={sw + 8}
        strokeLinecap="round"
        strokeOpacity={0.04}
      />

      {/* Zone arcs */}
      {zones.map((z) => (
        <Path
          key={z.start}
          d={arc(z.start, z.end)}
          fill="none"
          stroke={z.color}
          strokeOpacity={0.2}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      ))}

      {/* Active arc */}
      {activeArc ? (
        <Path
          d={activeArc}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
      ) : null}

      {/* Tick marks */}
      {Array.from({ length: 7 }).map((_, i) => {
        const deg = 180 - i * 30;
        const inner = pt(deg, r - 16);
        const outer = pt(deg, r + 2);
        const isMajor = i === 0 || i === 3 || i === 6;
        return (
          <Line
            key={i}
            x1={inner.x.toFixed(1)}
            y1={inner.y.toFixed(1)}
            x2={outer.x.toFixed(1)}
            y2={outer.y.toFixed(1)}
            stroke="#888"
            strokeWidth={isMajor ? 2 : 1.25}
            strokeOpacity={isMajor ? 0.34 : 0.14}
            strokeLinecap="round"
          />
        );
      })}

      {/* Needle */}
      <Path
        d={`M ${cx} ${cy} L ${needleTip.x.toFixed(1)} ${needleTip.y.toFixed(1)}`}
        stroke="#333"
        strokeWidth={4.5}
        strokeLinecap="round"
      />

      {/* Center hub */}
      <Circle
        cx={cx}
        cy={cy}
        r={18}
        fill={colors.card}
        stroke="#888"
        strokeWidth={2}
        strokeOpacity={0.1}
      />
      <Circle cx={cx} cy={cy} r={11} fill={accent} />

      {/* Marker dot on arc */}
      <Circle
        cx={parseFloat(marker.x.toFixed(1))}
        cy={parseFloat(marker.y.toFixed(1))}
        r={4.5}
        fill={accent}
      />

      {/* Labels */}
      <SvgText
        x={pt(180, r + 22).x.toFixed(1)}
        y={(pt(180, r + 22).y + 6).toFixed(1)}
        textAnchor="middle"
        fontSize={10}
        fill="#999"
      >
        0
      </SvgText>
      <SvgText
        x={pt(90, r + 24).x.toFixed(1)}
        y={(pt(90, r + 24).y - 2).toFixed(1)}
        textAnchor="middle"
        fontSize={10}
        fill="#999"
      >
        50
      </SvgText>
      <SvgText
        x={pt(0, r + 22).x.toFixed(1)}
        y={(pt(0, r + 22).y + 6).toFixed(1)}
        textAnchor="middle"
        fontSize={10}
        fill="#999"
      >
        100
      </SvgText>
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompatibilityDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { reportId, returnTo } = useLocalSearchParams<{
    reportId: string;
    returnTo?: string;
  }>();
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationIssue, setGenerationIssue] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const stepIndex = useGenerationStepTicker(report?.status);

  const tCompat = useTranslations('compatibility');
  const notifMessages = allMessages[getLocale()].notifications;

  const loadReport = useCallback(
    async (isRefresh = false) => {
      if (!reportId) return null;
      if (!isRefresh) setLoading(true);
      try {
        const { report: data } = await compatibilityApi.getReport(reportId);
        if (data.status !== 'pending' && data.status !== 'generating') {
          setGenerationIssue(false);
        }
        setReport(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [reportId],
  );

  const { refreshing, handleRefresh } = usePullToRefresh(async () => {
    setGenerationIssue(false);
    await loadReport(true);
  });

  useGenerationPolling({
    entityId: reportId,
    currentItem: report,
    fetchLatest: async () => {
      const { report: updated } = await compatibilityApi.getReport(reportId);
      return updated;
    },
    onUpdate: setReport,
    startGeneration: reportId ? () => compatibilityApi.startGeneration(reportId) : undefined,
    onReady: (updated, wasGenerating) => {
      if (wasGenerating) {
        void scheduleReadyNotification(updated.title ?? notifMessages.compatibilityReady);
      }
    },
    onGenerationIssue: () => {
      setGenerationIssue(true);
    },
  });

  useEffect(() => {
    if (!reportId) return;
    void loadReport();
  }, [loadReport, reportId]);
  async function handleRetry() {
    if (!reportId) return;
    setRetrying(true);
    setGenerationIssue(false);
    try {
      await compatibilityApi.resetForRetry(reportId);
      const { report: updated } = await compatibilityApi.getReport(reportId);
      setReport(updated);
    } catch {
      toast.error(tCompat('generatingErrorTitle'));
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return <CompatibilityDetailSkeleton />;
  }

  if (!report) {
    return (
      <DetailNotFoundState
        iconName="heart-dislike-outline"
        title={tCompat('notFoundTitle')}
        description={tCompat('notFoundDesc')}
        primaryLabel={tCompat('backToAll').replace(/^←\s*/, '')}
        onPrimaryPress={() => goBackTo(returnTo, routes.tabs.compatibility)}
        secondaryLabel={tCompat('retryLoad')}
        onSecondaryPress={() => void loadReport(true)}
      />
    );
  }

  const { status } = report;
  const content = report.rendered_content_json;
  const compatType = (report.compatibility_type ?? 'romantic') as CompatType;
  const isReady = status === 'ready';
  const isError = status === 'error';
  const isStalled = generationIssue && !isError;
  const hasGenerationError = isError || generationIssue;
  const isGenerating = (status === 'pending' || status === 'generating') && !isStalled;
  const generationErrorTitle = isStalled
    ? tCompat('stalledBannerTitle')
    : tCompat('errorBannerTitle');
  const generationErrorDescription = isStalled
    ? tCompat('stalledBannerDesc')
    : report.error_message?.trim() || tCompat('errorBannerDesc');
  const generationErrorActionLabel = isStalled
    ? tCompat('refreshStatus')
    : tCompat('generatingRetry');
  const handleGenerationAction = isStalled ? handleRefresh : handleRetry;

  const harmonyScore = report.harmony_score ?? content?.harmonyScore ?? 0;
  const harmonyColors = getHarmonyColors(harmonyScore);
  const harmonyKey = (() => {
    const level =
      harmonyScore >= 80
        ? 'High'
        : harmonyScore >= 65
          ? 'Good'
          : harmonyScore >= 45
            ? 'Moderate'
            : harmonyScore >= 25
              ? 'Neutral'
              : 'Difficult';
    return `harmony${level}_${compatType}`;
  })();
  const harmonyLabel = tCompat(`${harmonyKey}.label` as Parameters<typeof tCompat>[0]);
  const harmonyDesc = tCompat(`${harmonyKey}.description` as Parameters<typeof tCompat>[0]);

  const primaryName = report.primary_person_name ?? '?';
  const secondaryName = report.secondary_person_name ?? '?';
  const reportTitle =
    content?.title ??
    tCompat('reportTitleFallback', { primary: primaryName, secondary: secondaryName });

  const keyAspects = content?.keyAspects ?? [];
  const sections = content?.sections ?? [];
  const placementHighlights = content?.placementHighlights ?? [];
  const advice = content?.advice ?? [];
  const disclaimers = content?.disclaimers ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.topBar, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBackTo(returnTo, routes.tabs.compatibility)}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tCompat('backToAll').replace(/^←\s*/, '')}</Text>
        </TouchableOpacity>
        <View style={styles.chartLinks}>
          <TouchableOpacity
            style={styles.chartLinkButton}
            onPress={() =>
              openChartDetail(report.primary_chart_id, routes.compatibility.detail(reportId))
            }
          >
            <Text style={styles.chartLinkText} numberOfLines={1}>
              {primaryName}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chartLinkButton}
            onPress={() =>
              openChartDetail(report.secondary_chart_id, routes.compatibility.detail(reportId))
            }
          >
            <Text style={styles.chartLinkText} numberOfLines={1}>
              {secondaryName}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.typeLabel}>
          {tCompat(`type_${compatType}` as Parameters<typeof tCompat>[0])}
        </Text>
        <Text style={styles.reportTitle}>{reportTitle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>
            {new Date(report.created_at).toLocaleDateString(getLocale(), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {!isReady ? (
            <View
              style={[
                styles.statusBadge,
                hasGenerationError ? styles.statusBadgeError : styles.statusBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  hasGenerationError ? styles.statusBadgeTextError : styles.statusBadgeTextPending,
                ]}
              >
                {isError
                  ? tCompat('statusError')
                  : isStalled
                    ? tCompat('statusDelayed')
                    : status === 'generating'
                      ? tCompat('statusGenerating')
                      : tCompat('statusPending')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {/* Generating */}
      {isGenerating ? (
        <View style={styles.generatingBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>{tCompat('generatingTitle')}</Text>
          <Text style={styles.generatingStep}>
            {
              [
                tCompat('generatingStep1'),
                tCompat('generatingStep2'),
                tCompat('generatingStep3'),
                tCompat('generatingStep4'),
              ][stepIndex]
            }
          </Text>
          <View style={styles.progressDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Error banner + retry */}
      {hasGenerationError ? (
        <DetailErrorBanner
          title={generationErrorTitle}
          description={generationErrorDescription}
          retryLabel={generationErrorActionLabel}
          onRetry={handleGenerationAction}
          retrying={retrying}
        />
      ) : null}

      {/* ── Ready content ── */}
      {isReady && !hasGenerationError ? (
        <>
          {/* Harmony score card */}
          <View style={styles.harmonyCard}>
            {/* Person pair header */}
            <View style={styles.personPairRow}>
              <View style={styles.personCell}>
                <View style={[styles.personAvatar, { backgroundColor: colors.primaryTint }]}>
                  <Text style={[styles.personInitial, { color: colors.primary }]}>
                    {primaryName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {primaryName}
                  </Text>
                  <Text style={styles.personRole}>{tCompat('primaryChart')}</Text>
                </View>
              </View>
              <Text style={styles.crossSign}>×</Text>
              <View style={[styles.personCell, styles.personCellRight]}>
                <View style={[styles.personAvatar, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.personInitial, { color: colors.foreground }]}>
                    {secondaryName[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={[styles.personInfo, styles.personInfoRight]}>
                  <Text style={[styles.personName, styles.personNameRight]} numberOfLines={1}>
                    {secondaryName}
                  </Text>
                  <Text style={[styles.personRole, styles.personRoleRight]}>
                    {tCompat('secondaryChart')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Gauge + score */}
            <View style={styles.gaugeSection}>
              <Text style={styles.harmonyIndexLabel}>{tCompat('harmonyIndex')}</Text>
              <SpeedometerGauge score={harmonyScore} accent={harmonyColors.accent} />
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{harmonyScore}</Text>
                <Text style={styles.scoreOutOf}>{tCompat('outOf100')}</Text>
              </View>
              <View
                style={[
                  styles.harmonyPill,
                  {
                    backgroundColor: harmonyColors.softAccent,
                    borderColor: `${harmonyColors.accent}33`,
                  },
                ]}
              >
                <Text style={[styles.harmonyPillText, { color: harmonyColors.accent }]}>
                  {harmonyLabel}
                </Text>
              </View>
              <Text style={styles.harmonyDesc}>{harmonyDesc}</Text>
            </View>

            {/* Info boxes */}
            <View style={styles.infoBoxes}>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>{tCompat('infoWhatWeCount')}</Text>
                <Text style={styles.infoBoxBody}>{tCompat('infoPlanets')}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>{tCompat('infoBasisTitle')}</Text>
                <Text style={styles.infoBoxBody}>{tCompat('infoBasisBody')}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>{tCompat('infoInterpretTitle')}</Text>
                <Text style={styles.infoBoxBody}>
                  {tCompat(`infoInterpretBody_${compatType}` as Parameters<typeof tCompat>[0])}
                </Text>
              </View>
            </View>
          </View>

          {/* Summary */}
          {content?.summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{content.summary}</Text>
            </View>
          ) : null}

          {/* Key Aspects */}
          {keyAspects.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{tCompat('keyAspects')}</Text>
              {keyAspects.map((aspect, i) => (
                <View key={i} style={styles.aspectCard}>
                  <View style={styles.aspectHeader}>
                    <Text style={styles.aspectPlanets}>
                      {aspect.bodyA} — {aspect.bodyB}
                    </Text>
                    <Text style={styles.aspectKey}>{aspect.aspectKey}</Text>
                  </View>
                  <Text style={styles.aspectHeadline}>{aspect.headline}</Text>
                  <Text style={styles.aspectBody}>{aspect.body}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Placement highlights */}
          {placementHighlights.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{tCompat('keyAspects')}</Text>
              <View style={styles.highlightsGrid}>
                {placementHighlights.map((h, i) => (
                  <View key={i} style={styles.highlightCell}>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Sections */}
          {sections.length > 0 ? (
            <View style={styles.sectionsBlock}>
              {sections.map((section, idx) => (
                <View key={section.key} style={styles.sectionItem}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionCircle}>
                      <Text style={styles.sectionCircleText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <View style={styles.sectionBody}>
                    {section.content
                      .split('\n\n')
                      .filter(Boolean)
                      .map((para, pIdx) => (
                        <Text key={pIdx} style={styles.sectionParagraph}>
                          {para}
                        </Text>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Advice */}
          {advice.length > 0 ? (
            <View style={styles.adviceCard}>
              <Text style={styles.adviceHeading}>{tCompat('adviceHeading')}</Text>
              {advice.map((item, idx) => (
                <View key={idx} style={styles.numberedRow}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberCircleText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.numberedText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Disclaimers */}
          {disclaimers.length > 0 ? (
            <View style={styles.disclaimersCard}>
              <Text style={styles.disclaimersText}>{disclaimers.join(' ')}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 12,
      padding: 24,
    },

    // ── Top bar ───────────────────────────────────────────────────────────────────
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      gap: 8,
    },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: colors.mutedForeground, fontSize: 14 },
    chartLinks: { flexDirection: 'row', gap: 6, flexShrink: 1 },
    chartLinkButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      maxWidth: 120,
    },
    chartLinkText: { fontSize: 12, color: colors.primary, fontWeight: '500' },

    // ── Title block ───────────────────────────────────────────────────────────────
    titleBlock: { gap: 6, marginBottom: 20 },
    typeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    reportTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      lineHeight: 30,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    dateText: { fontSize: 13, color: colors.mutedForeground },
    statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadgeError: { backgroundColor: colors.destructiveSubtle },
    statusBadgePending: { backgroundColor: '#FEF3C7' },
    statusBadgeText: { fontSize: 11, fontWeight: '600' },
    statusBadgeTextError: { color: colors.destructive },
    statusBadgeTextPending: { color: '#92400E' },

    // ── Generating ────────────────────────────────────────────────────────────────
    generatingBlock: { alignItems: 'center', gap: 16, paddingVertical: 48 },
    generatingTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    generatingStep: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      minHeight: 20,
    },
    progressDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
    progressDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: colors.primaryTint },
    progressDotActive: { backgroundColor: colors.primary },

    // ── Error ─────────────────────────────────────────────────────────────────────
    buttonDisabled: { opacity: 0.6 },

    // ── Harmony card ─────────────────────────────────────────────────────────────
    harmonyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 20,
      ...cardShadow,
    },

    // Person pair header
    personPairRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    personCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    personCellRight: { flexDirection: 'row-reverse' },
    personAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    personInitial: { fontSize: 15, fontWeight: '700' },
    personInfo: { flex: 1, minWidth: 0 },
    personInfoRight: { alignItems: 'flex-end' },
    personName: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    personNameRight: { textAlign: 'right' },
    personRole: { fontSize: 11, color: colors.mutedForeground },
    personRoleRight: { textAlign: 'right' },
    crossSign: { fontSize: 18, color: colors.mutedForeground, fontWeight: '300', flexShrink: 0 },

    // Gauge section
    gaugeSection: { paddingHorizontal: 16, paddingTop: 16, alignItems: 'center', gap: 8 },
    harmonyIndexLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    scoreNumber: { fontSize: 48, fontWeight: '600', color: colors.foreground, letterSpacing: -1 },
    scoreOutOf: {
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    harmonyPill: {
      borderWidth: 1,
      borderRadius: 99,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    harmonyPillText: { fontSize: 13, fontWeight: '600' },
    harmonyDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: 8,
      paddingBottom: 4,
    },

    // Info boxes
    infoBoxes: { paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
    infoBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 4,
    },
    infoBoxTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    infoBoxBody: { fontSize: 12, color: colors.foreground, lineHeight: 18 },

    // ── Summary ───────────────────────────────────────────────────────────────────
    summaryCard: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      padding: 20,
      marginBottom: 20,
    },
    summaryText: { fontSize: 15, color: colors.foreground, lineHeight: 26, fontStyle: 'italic' },

    // ── Key Aspects ───────────────────────────────────────────────────────────────
    sectionBlock: { marginBottom: 20 },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 10,
    },
    aspectCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 8,
      gap: 4,
      ...cardShadow,
    },
    aspectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    aspectPlanets: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    aspectKey: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    aspectHeadline: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    aspectBody: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19 },

    // ── Placement highlights ──────────────────────────────────────────────────────
    highlightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    highlightCell: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...cardShadow,
    },
    highlightText: { fontSize: 13, color: colors.foreground, lineHeight: 19 },

    // ── Sections ──────────────────────────────────────────────────────────────────
    sectionsBlock: { gap: 24, marginBottom: 20 },
    sectionItem: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sectionCircleText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
      letterSpacing: -0.3,
    },
    sectionBody: { paddingLeft: 38, gap: 10 },
    sectionParagraph: { fontSize: 15, color: colors.foreground, lineHeight: 26 },

    // ── Advice ────────────────────────────────────────────────────────────────────
    adviceCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      padding: 16,
      gap: 12,
      marginBottom: 20,
    },
    adviceHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    numberedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    numberCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    numberCircleText: { fontSize: 10, fontWeight: '700', color: colors.primary },
    numberedText: { flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 21 },

    // ── Disclaimers ───────────────────────────────────────────────────────────────
    disclaimersCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    disclaimersText: { fontSize: 11, color: colors.mutedForeground, lineHeight: 17 },
  });
}
