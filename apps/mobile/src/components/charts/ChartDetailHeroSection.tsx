import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChartDetail } from '@clario/api-client';
import { cardShadow, useColors } from '@/lib/colors';
import { DetailErrorBanner } from '@/components/DetailErrorBanner';

interface ChartDetailHeroSectionProps {
  chart: ChartDetail['chart'];
  initial: string;
  avatarColors: {
    bg: string;
    text: string;
  };
  subjectTypeLabel: string;
  sunSign: string;
  moonSign: string;
  ascSign: string;
  birthDateLabel: string;
  birthPlaceLabel: string;
  birthTimeUnknownLabel: string;
  houseSystemLabel: string;
  houseSystemValue: string;
  createReadingLabel: string;
  compareWithChartLabel: string;
  createReadingNotReadyLabel: string;
  statusPendingBannerTitle: string;
  statusPendingBannerDesc: string;
  statusErrorBannerTitle: string;
  statusErrorBannerDesc: string;
  onCreateReadingPress: () => void;
  onComparePress: () => void;
}

export function ChartDetailHeroSection({
  chart,
  initial,
  avatarColors,
  subjectTypeLabel,
  sunSign,
  moonSign,
  ascSign,
  birthDateLabel,
  birthPlaceLabel,
  birthTimeUnknownLabel,
  houseSystemLabel,
  houseSystemValue,
  createReadingLabel,
  compareWithChartLabel,
  createReadingNotReadyLabel,
  statusPendingBannerTitle,
  statusPendingBannerDesc,
  statusErrorBannerTitle,
  statusErrorBannerDesc,
  onCreateReadingPress,
  onComparePress,
}: ChartDetailHeroSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColors.bg }]}>
            <Text style={[styles.avatarText, { color: avatarColors.text }]}>{initial}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.personName}>{chart.person_name}</Text>
            <Text style={styles.chartLabel}>{chart.label}</Text>
            <Text style={styles.subjectTypeBadge}>{subjectTypeLabel}</Text>
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

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{birthDateLabel}</Text>
            <Text style={styles.detailValue}>
              {chart.birth_date}
              {chart.birth_time_known && chart.birth_time
                ? ` · ${chart.birth_time}`
                : ` · ${birthTimeUnknownLabel}`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{birthPlaceLabel}</Text>
            <Text style={styles.detailValue}>
              {chart.city}, {chart.country}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{houseSystemLabel}</Text>
            <Text style={styles.detailValue}>{houseSystemValue}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, chart.status !== 'ready' && styles.primaryButtonDisabled]}
          onPress={onCreateReadingPress}
          disabled={chart.status !== 'ready'}
        >
          <Text style={styles.primaryButtonText}>{createReadingLabel}</Text>
        </TouchableOpacity>
        {chart.status !== 'ready' ? (
          <Text style={styles.notReadyHint}>{createReadingNotReadyLabel}</Text>
        ) : null}
        <TouchableOpacity style={styles.outlineButton} onPress={onComparePress}>
          <Ionicons name="link-outline" size={16} color={colors.primary} />
          <Text style={styles.outlineButtonText}>{compareWithChartLabel}</Text>
        </TouchableOpacity>
      </View>

      {chart.status === 'pending' ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>{statusPendingBannerTitle}</Text>
          <Text style={styles.infoBannerDesc}>{statusPendingBannerDesc}</Text>
        </View>
      ) : chart.status === 'error' ? (
        <DetailErrorBanner
          title={statusErrorBannerTitle}
          description={statusErrorBannerDesc}
          variant="compact"
          centered={false}
        />
      ) : null}
    </>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
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
  });
}
