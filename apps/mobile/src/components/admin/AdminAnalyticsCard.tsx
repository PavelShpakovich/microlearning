import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/components/Skeleton';
import { cardShadow, useColors } from '@/lib/colors';

interface AnalyticsStatItem {
  label: string;
  value: number | string;
  icon: ComponentProps<typeof Ionicons>['name'];
  wide: boolean;
}

interface AdminAnalyticsCardProps {
  loading: boolean;
  title: string;
  stats: AnalyticsStatItem[];
}

function AnalyticsSkeletonCard() {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={15} height={15} borderRadius={4} />
        <Skeleton width={120} height={13} />
      </View>
      <View style={styles.statsGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={[styles.statCard, { gap: 6 }]}>
            <Skeleton width={16} height={16} borderRadius={4} />
            <Skeleton width={48} height={22} borderRadius={6} />
            <Skeleton width={'80%'} height={10} borderRadius={4} />
          </View>
        ))}
        <View style={[styles.statCard, styles.statCardWide, { gap: 6 }]}>
          <Skeleton width={16} height={16} borderRadius={4} />
          <Skeleton width={90} height={22} borderRadius={6} />
          <Skeleton width={'50%'} height={10} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function AdminAnalyticsCard({ loading, title, stats }: AdminAnalyticsCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  if (loading) {
    return <AnalyticsSkeletonCard />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="bar-chart-outline" size={15} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, stat.wide && styles.statCardWide]}>
            <Ionicons name={stat.icon} size={16} color={colors.primary} style={styles.statIcon} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      ...cardShadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statCard: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 12,
      width: '47%',
      flexGrow: 1,
      gap: 2,
    },
    statCardWide: {
      width: '100%',
      flexGrow: 0,
    },
    statIcon: {
      marginBottom: 2,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
  });
}
