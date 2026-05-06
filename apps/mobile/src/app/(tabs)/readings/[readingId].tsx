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
import {
  goToRoute,
  openChartDetail,
  openReadingChat,
  resolveParentRoute,
  routes,
} from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { readingsApi, getAuthHeaders, resolveUrl } from '@clario/api-client';
import type { ReadingDetail } from '@clario/api-client';
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

function ReadingDetailSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollEnabled={false}
    >
      {/* Back button */}
      <View
        style={[
          styles.backButton,
          { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET, marginBottom: 16 },
        ]}
      >
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={96} height={14} />
      </View>

      {/* Title block */}
      <View style={[styles.titleBlock, { gap: 8 }]}>
        <Skeleton width={100} height={12} borderRadius={6} />
        <Skeleton width={'80%'} height={22} borderRadius={6} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 }}>
          <Skeleton width={90} height={13} borderRadius={6} />
          <Skeleton width={70} height={22} borderRadius={11} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={[styles.actionsRow, { marginBottom: 20 }]}>
        <Skeleton width={110} height={36} borderRadius={10} />
        <Skeleton width={130} height={36} borderRadius={10} />
      </View>

      {/* Summary card */}
      <View style={[styles.summaryCard, { gap: 8 }]}>
        <Skeleton width={'96%'} height={14} borderRadius={6} />
        <Skeleton width={'95%'} height={14} borderRadius={6} />
        <Skeleton width={'80%'} height={14} borderRadius={6} />
      </View>

      {/* Key takeaways card */}
      <View style={[styles.takeawaysCard, { gap: 12 }]}>
        <Skeleton width={130} height={16} borderRadius={6} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Skeleton width={28} height={28} borderRadius={14} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={'90%'} height={13} borderRadius={6} />
              <Skeleton width={'70%'} height={13} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>

      {/* Section cards */}
      {[0, 1].map((i) => (
        <View key={i} style={[styles.sectionItem, { gap: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Skeleton width={28} height={28} borderRadius={14} />
            <Skeleton width={'60%'} height={16} borderRadius={6} />
          </View>
          <Skeleton width={'96%'} height={13} borderRadius={6} />
          <Skeleton width={'90%'} height={13} borderRadius={6} />
          <Skeleton width={'75%'} height={13} borderRadius={6} />
        </View>
      ))}
    </ScrollView>
  );
}

export default function ReadingDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { readingId, returnTo } = useLocalSearchParams<{ readingId: string; returnTo?: string }>();
  const [reading, setReading] = useState<ReadingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationIssue, setGenerationIssue] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const tDetail = useTranslations('readingDetail');
  const tGenerating = useTranslations('readingGenerating');
  const notifMessages = allMessages[getLocale()].notifications;

  const tDashboard = useTranslations('dashboard');
  const backTarget = resolveParentRoute(returnTo, routes.tabs.readings);
  const backLabel =
    backTarget === routes.tabs.home ? tDashboard('pageTitle') : tDetail('backToReadings');
  const fallbackLabel =
    backTarget === routes.tabs.home ? tDashboard('pageTitle') : tDetail('allReadings');
  const stepIndex = useGenerationStepTicker(reading?.status);

  const loadReading = useCallback(
    async (isRefresh = false) => {
      if (!readingId) return null;
      if (!isRefresh) setLoading(true);
      try {
        const { reading: data } = await readingsApi.getReading(readingId);
        if (data.status !== 'pending' && data.status !== 'generating') {
          setGenerationIssue(false);
        }
        setReading(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [readingId],
  );

  const { refreshing, handleRefresh } = usePullToRefresh(async () => {
    setGenerationIssue(false);
    await loadReading(true);
  });

  useGenerationPolling({
    entityId: readingId,
    currentItem: reading,
    fetchLatest: async () => {
      const { reading: updated } = await readingsApi.getReading(readingId);
      return updated;
    },
    onUpdate: setReading,
    startGeneration: readingId ? () => readingsApi.startGeneration(readingId) : undefined,
    onReady: (updated, wasGenerating) => {
      if (wasGenerating) {
        void scheduleReadyNotification(updated.title ?? notifMessages.readingReady);
      }
    },
    onGenerationIssue: () => {
      setGenerationIssue(true);
    },
  });

  useEffect(() => {
    if (!readingId) return;
    void loadReading();
  }, [loadReading, readingId]);

  async function handleDownloadPdf() {
    if (!readingId) return;
    setDownloadingPdf(true);
    try {
      const authHeaders = await getAuthHeaders();
      const url = resolveUrl(`/api/readings/${readingId}/pdf`);
      const localUri = `${FileSystem.cacheDirectory}reading-${readingId}.pdf`;
      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: authHeaders,
      });
      if (result.status !== 200) {
        toast.error(tDetail('downloadPdfError'));
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: reading?.title ?? tDetail('downloadPdf'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        toast.success(tDetail('downloadPdfSaved'));
      }
    } catch {
      toast.error(tDetail('downloadPdfError'));
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleRetry() {
    if (!readingId) return;
    setRetrying(true);
    setGenerationIssue(false);
    try {
      await readingsApi.resetForRetry(readingId);
      const { reading: refreshed } = await readingsApi.getReading(readingId);
      setReading(refreshed);
    } finally {
      setRetrying(false);
    }
  }

  const readingTypeLabels = allMessages[getLocale()].readingDetail.readingTypes as Record<
    string,
    string
  >;

  if (loading) {
    return <ReadingDetailSkeleton />;
  }

  if (!reading) {
    return (
      <DetailNotFoundState
        iconName="sparkles-outline"
        title={tDetail('notFoundTitle')}
        description={tDetail('notFoundDesc')}
        primaryLabel={fallbackLabel}
        onPrimaryPress={() => goToRoute(returnTo, routes.tabs.readings)}
        secondaryLabel={tDetail('retryLoad')}
        onSecondaryPress={() => void loadReading(true)}
      />
    );
  }

  if (!reading) return null;

  const { status } = reading;
  const content = reading.rendered_content_json;
  const placementHighlights = content?.placementHighlights ?? [];
  const advice = content?.advice ?? [];
  const disclaimers = content?.disclaimers ?? [];
  const isReady = status === 'ready';
  const isError = status === 'error';
  const isStalled = generationIssue && !isError;
  const hasGenerationError = isError || generationIssue;
  const isGenerating = (status === 'pending' || status === 'generating') && !isStalled;
  const generationErrorTitle = isStalled
    ? tDetail('stalledBannerTitle')
    : tDetail('errorBannerTitle');
  const generationErrorDescription = isStalled
    ? tDetail('stalledBannerDesc')
    : reading.error_message?.trim() || tDetail('errorBannerDesc');
  const generationErrorActionLabel = isStalled
    ? tGenerating('refreshButton')
    : tGenerating('retryButton');
  const handleGenerationAction = isStalled ? handleRefresh : handleRetry;

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
      <TouchableOpacity
        style={[styles.backButton, { marginTop: insets.top + SCREEN_TOP_INSET_OFFSET }]}
        onPress={() => goToRoute(returnTo, routes.tabs.readings)}
      >
        <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
        <Text style={styles.backText}>{backLabel}</Text>
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <Text style={styles.typeLabel}>
          {readingTypeLabels[reading.reading_type] ?? reading.reading_type}
        </Text>
        <Text style={styles.title}>{reading.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>
            {reading.created_at
              ? new Date(reading.created_at).toLocaleDateString(getLocale(), {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''}
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
                  ? tDetail('statusError')
                  : isStalled
                    ? tDetail('statusDelayed')
                    : status === 'generating'
                      ? tDetail('statusGenerating')
                      : tDetail('statusPending')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* View Chart — always shown */}
        {reading.chart_id ? (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => openChartDetail(reading.chart_id, routes.readings.tabDetail(readingId))}
          >
            <Ionicons name="planet-outline" size={15} color={colors.primary} />
            <Text style={styles.outlineButtonText}>{tDetail('viewChart')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Ask follow-up — only if ready */}
        {isReady ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => openReadingChat(readingId)}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.primaryForeground} />
            <Text style={styles.primaryButtonText}>{tDetail('askFollowUp')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Download PDF — only if ready */}
        {isReady ? (
          <TouchableOpacity
            style={[styles.outlineButton, downloadingPdf && styles.buttonDisabled]}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={15} color={colors.primary} />
                <Text style={styles.outlineButtonText}>{tDetail('downloadPdf')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Generating / pending spinner */}
      {isGenerating ? (
        <View style={styles.generatingBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>{tGenerating('title')}</Text>
          <Text style={styles.generatingStep}>
            {
              [
                tGenerating('analyzing'),
                tGenerating('writing'),
                tGenerating('reviewing'),
                tGenerating('finalizing'),
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

      {/* Error banner */}
      {hasGenerationError ? (
        <DetailErrorBanner
          title={generationErrorTitle}
          description={generationErrorDescription}
          retryLabel={generationErrorActionLabel}
          onRetry={handleGenerationAction}
          retrying={retrying}
        />
      ) : null}

      {/* Content — only when ready */}
      {isReady && !hasGenerationError ? (
        <>
          {/* Summary */}
          {reading.summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{reading.summary}</Text>
            </View>
          ) : null}

          {/* Key Takeaways (advice) */}
          {advice.length > 0 ? (
            <View style={styles.takeawaysCard}>
              <Text style={styles.takeawaysHeading}>{tDetail('keyTakeaways')}</Text>
              {advice.map((item, idx) => (
                <View key={idx} style={styles.numberedRow}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberCircleText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.numberedRowText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Sections */}
          {reading.reading_sections.length > 0 ? (
            <View style={styles.sectionsBlock}>
              {reading.reading_sections.map((section, idx) => (
                <View key={section.id} style={styles.sectionItem}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionNumberCircle}>
                      <Text style={styles.sectionNumberText}>{idx + 1}</Text>
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

          {/* Placement Highlights — 2-column grid */}
          {placementHighlights.length > 0 ? (
            <View style={styles.highlightsBlock}>
              <Text style={styles.highlightsTitle}>{tDetail('placementHighlights')}</Text>
              <View style={styles.highlightsGrid}>
                {placementHighlights.map((item, idx) => (
                  <View key={idx} style={styles.highlightCell}>
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 48,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 12,
      backgroundColor: colors.background,
    },

    // ── Back ─────────────────────────────────────────────────────────────────────
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 20,
      alignSelf: 'flex-start',
    },
    backText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },

    // ── Title block ───────────────────────────────────────────────────────────────
    titleBlock: {
      gap: 6,
      marginBottom: 20,
    },
    typeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    dateText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    statusBadge: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusBadgeError: {
      backgroundColor: colors.destructiveSubtle,
    },
    statusBadgePending: {
      backgroundColor: '#FEF3C7',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    statusBadgeTextError: {
      color: colors.destructive,
    },
    statusBadgeTextPending: {
      color: '#92400E',
    },

    // ── Action buttons ────────────────────────────────────────────────────────────
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      height: 36,
      borderRadius: 8,
      paddingHorizontal: 14,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      height: 36,
      borderRadius: 8,
      paddingHorizontal: 14,
    },
    outlineButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },

    // ── Generating ────────────────────────────────────────────────────────────────
    generatingBlock: {
      alignItems: 'center',
      gap: 16,
      paddingVertical: 48,
    },
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
    progressDots: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    progressDot: {
      width: 24,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primaryTint,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },

    // ── Error banner ──────────────────────────────────────────────────────────────

    // ── Summary ───────────────────────────────────────────────────────────────────
    summaryCard: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      padding: 20,
      marginBottom: 20,
    },
    summaryText: {
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 26,
      fontStyle: 'italic',
    },

    // ── Key Takeaways ─────────────────────────────────────────────────────────────
    takeawaysCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      padding: 16,
      gap: 12,
      marginBottom: 20,
    },
    takeawaysHeading: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    numberedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
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
    numberCircleText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    numberedRowText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 21,
    },

    // ── Sections ──────────────────────────────────────────────────────────────────
    sectionsBlock: {
      gap: 28,
      marginBottom: 20,
    },
    sectionItem: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionNumberCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sectionNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
      letterSpacing: -0.3,
    },
    sectionBody: {
      paddingLeft: 38,
      gap: 10,
    },
    sectionParagraph: {
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 26,
    },

    // ── Placement Highlights ──────────────────────────────────────────────────────
    highlightsBlock: {
      gap: 10,
      marginBottom: 20,
    },
    highlightsTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    highlightsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    highlightCell: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...cardShadow,
    },
    highlightText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 19,
    },

    // ── Disclaimers ───────────────────────────────────────────────────────────────
    disclaimersCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 8,
    },
    disclaimersText: {
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 17,
    },
  });
}
