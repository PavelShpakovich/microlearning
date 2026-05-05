import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChartReadingRow } from '@clario/api-client';
import { cardShadow, useColors } from '@/lib/colors';
import { getLocale } from '@/lib/i18n';

interface ChartLinkedReadingsSectionProps {
  title: string;
  emptyTitle: string;
  emptyHint: string;
  readings: ChartReadingRow[];
  readingsLoading: boolean;
  readingsTotal: number;
  readingsPage: number;
  pageSize: number;
  readingTypeLabels: Record<string, string>;
  readingStatusLabels: Record<string, string>;
  readingStatusColors: Record<string, string>;
  onPressReading: (readingId: string) => void;
  onPageChange: (page: number) => void;
  onSectionLayout: (y: number) => void;
  getPageLabel: (current: number, total: number) => string;
}

export function ChartLinkedReadingsSection({
  title,
  emptyTitle,
  emptyHint,
  readings,
  readingsLoading,
  readingsTotal,
  readingsPage,
  pageSize,
  readingTypeLabels,
  readingStatusLabels,
  readingStatusColors,
  onPressReading,
  onPageChange,
  onSectionLayout,
  getPageLabel,
}: ChartLinkedReadingsSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);
  const totalPages = Math.ceil(readingsTotal / pageSize);

  return (
    <View
      style={styles.section}
      onLayout={(event) => {
        onSectionLayout(event.nativeEvent.layout.y);
      }}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {readings.length === 0 && !readingsLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{emptyTitle}</Text>
          <Text style={styles.emptyStateHint}>{emptyHint}</Text>
        </View>
      ) : (
        <View style={readingsLoading ? styles.loadingList : styles.list}>
          {readings.map((reading) => {
            const readingTypeLabel =
              readingTypeLabels[reading.reading_type] ?? reading.reading_type.replace(/_/g, ' ');
            const dateLabel = new Date(reading.created_at).toLocaleDateString(getLocale());

            return (
              <TouchableOpacity
                key={reading.id}
                style={styles.readingCard}
                onPress={() => onPressReading(reading.id)}
              >
                <View style={styles.readingCardRow}>
                  <View style={styles.readingCardLeft}>
                    <Text style={styles.readingCardTitle} numberOfLines={1}>
                      {reading.title}
                    </Text>
                    <Text style={styles.readingCardMeta}>
                      {readingTypeLabel} · {dateLabel}
                    </Text>
                    {reading.summary ? (
                      <Text style={styles.readingCardSub} numberOfLines={2}>
                        {reading.summary}
                      </Text>
                    ) : null}
                  </View>
                  {reading.status !== 'ready' ? (
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: readingStatusColors[reading.status] ?? '#6b7280' },
                      ]}
                    >
                      <Text style={styles.statusChipText}>
                        {readingStatusLabels[reading.status] ?? reading.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}

          {totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  (readingsPage <= 1 || readingsLoading) && styles.pageBtnDisabled,
                ]}
                onPress={() => onPageChange(readingsPage - 1)}
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
                <Text style={styles.pageLabel}>{getPageLabel(readingsPage, totalPages)}</Text>
              )}
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  (readingsPage >= totalPages || readingsLoading) && styles.pageBtnDisabled,
                ]}
                onPress={() => onPageChange(readingsPage + 1)}
                disabled={readingsPage >= totalPages || readingsLoading}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={readingsPage >= totalPages ? colors.mutedForeground : colors.foreground}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    list: {
      gap: 8,
    },
    loadingList: {
      gap: 8,
      opacity: 0.5,
    },
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
    emptyStateHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 4,
    },
  });
}
