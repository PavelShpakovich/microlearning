import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, useColors } from '@/lib/colors';

interface DotStatRow {
  id: string;
  label: string;
  count: number;
  activeColor: string;
}

interface AboutItem {
  id: string;
  iconText: string;
  iconTextColor: string;
  iconBackgroundColor: string;
  meta: string;
  value: string;
  valueMuted?: string;
  secondaryMeta?: string;
}

interface StelliumItem {
  id: string;
  title: string;
  bodies: string;
}

interface DignityItem {
  id: string;
  symbol: string;
  symbolColor: string;
  planet: string;
  type: string;
  short: string;
  backgroundColor: string;
  textColor: string;
}

interface UnaspectedItem {
  id: string;
  symbol: string;
  symbolColor: string;
  planet: string;
  sign: string;
}

interface ChartStatsSectionProps {
  elementsTitle: string;
  elementRows: DotStatRow[];
  modalitiesTitle: string;
  modalityRows: DotStatRow[];
  aboutChartTitle: string;
  aboutItems: AboutItem[];
  aboutHint?: string;
  polarityTitle: string;
  polarityDesc: string;
  polarityRows: DotStatRow[];
  stelliumsTitle: string;
  stelliumsDesc: string;
  noStelliumsLabel: string;
  stelliums: StelliumItem[];
  dignityTitle: string;
  dignityDesc: string;
  dignities: DignityItem[];
  unaspectedTitle: string;
  unaspectedDesc: string;
  unaspected: UnaspectedItem[];
}

export function ChartStatsSection({
  elementsTitle,
  elementRows,
  modalitiesTitle,
  modalityRows,
  aboutChartTitle,
  aboutItems,
  aboutHint,
  polarityTitle,
  polarityDesc,
  polarityRows,
  stelliumsTitle,
  stelliumsDesc,
  noStelliumsLabel,
  stelliums,
  dignityTitle,
  dignityDesc,
  dignities,
  unaspectedTitle,
  unaspectedDesc,
  unaspected,
}: ChartStatsSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  if (elementRows.length === 0) {
    return null;
  }

  return (
    <View style={styles.statsSection}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{elementsTitle}</Text>
          {elementRows.map((row) => (
            <DotStatItem key={row.id} row={row} />
          ))}
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{modalitiesTitle}</Text>
          {modalityRows.map((row) => (
            <DotStatItem key={row.id} row={row} />
          ))}
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statCardTitle}>{aboutChartTitle}</Text>
        {aboutItems.map((item) => (
          <View key={item.id} style={styles.aboutRow}>
            <View style={[styles.aboutIcon, { backgroundColor: item.iconBackgroundColor }]}>
              <Text style={[styles.aboutIconText, { color: item.iconTextColor }]}>
                {item.iconText}
              </Text>
            </View>
            <View style={styles.aboutInfo}>
              <Text style={styles.aboutMeta}>{item.meta}</Text>
              <Text style={styles.aboutValue}>
                {item.value}
                {item.valueMuted ? (
                  <Text style={styles.aboutValueMuted}> {item.valueMuted}</Text>
                ) : null}
              </Text>
              {item.secondaryMeta ? (
                <Text style={styles.aboutMeta}>{item.secondaryMeta}</Text>
              ) : null}
            </View>
          </View>
        ))}
        {aboutItems.length === 0 && aboutHint ? (
          <Text style={styles.aboutHint}>{aboutHint}</Text>
        ) : null}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statCardTitle}>{polarityTitle}</Text>
        <Text style={styles.statCardDesc}>{polarityDesc}</Text>
        {polarityRows.map((row) => (
          <DotStatItem key={row.id} row={row} />
        ))}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statCardTitle}>{stelliumsTitle}</Text>
        <Text style={styles.statCardDesc}>{stelliumsDesc}</Text>
        {stelliums.length === 0 ? (
          <Text style={styles.statEmptyText}>{noStelliumsLabel}</Text>
        ) : (
          stelliums.map((item) => (
            <View key={item.id} style={styles.stelliumItem}>
              <Text style={styles.stelliumTitle}>{item.title}</Text>
              <Text style={styles.stelliumBodies}>{item.bodies}</Text>
            </View>
          ))
        )}
      </View>

      {dignities.length > 0 ? (
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{dignityTitle}</Text>
          <Text style={styles.statCardDesc}>{dignityDesc}</Text>
          {dignities.map((item) => (
            <View
              key={item.id}
              style={[styles.dignityRow, { backgroundColor: item.backgroundColor }]}
            >
              <Text style={[styles.dignitySymbol, { color: item.symbolColor }]}>{item.symbol}</Text>
              <Text style={[styles.dignityPlanet, { color: item.textColor }]}>{item.planet}</Text>
              <Text style={[styles.dignityType, { color: item.textColor }]}>{item.type}</Text>
              <Text style={[styles.dignityShort, { color: item.textColor }]}>{item.short}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {unaspected.length > 0 ? (
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{unaspectedTitle}</Text>
          <Text style={styles.statCardDesc}>{unaspectedDesc}</Text>
          {unaspected.map((item) => (
            <View key={item.id} style={styles.unaspectedRow}>
              <Text style={[styles.dignitySymbol, { color: item.symbolColor }]}>{item.symbol}</Text>
              <Text style={styles.unaspectedPlanet}>{item.planet}</Text>
              <Text style={styles.unaspectedSign}>{item.sign}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DotStatItem({ row }: { row: DotStatRow }) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{row.label}</Text>
      <View style={styles.dotRow}>
        {Array.from({ length: 7 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index < row.count ? row.activeColor : colors.muted },
            ]}
          />
        ))}
      </View>
      <Text style={styles.statCount}>{row.count}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
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
