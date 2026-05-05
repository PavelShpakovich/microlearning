import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/colors';

interface ChartPositionItem {
  id: string;
  symbol: string;
  symbolColor: string;
  symbolBackgroundColor: string;
  planetName: string;
  retrograde: boolean;
  meaning?: string;
  signLabel: string;
  houseLabel?: string;
  dignityLabel?: string;
  dignityBackgroundColor?: string;
  dignityTextColor?: string;
  keyword?: string;
}

interface ChartAngleItem {
  id: string;
  shortLabel: string;
  label: string;
  signLabel: string;
}

interface ChartPositionsSectionProps {
  title: string;
  positions: ChartPositionItem[];
  angles: ChartAngleItem[];
}

export function ChartPositionsSection({ title, positions, angles }: ChartPositionsSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  if (positions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {positions.map((position) => (
        <View key={position.id} style={styles.positionRow}>
          <View style={[styles.planetSymbol, { backgroundColor: position.symbolBackgroundColor }]}>
            <Text style={[styles.planetSymbolText, { color: position.symbolColor }]}>
              {position.symbol}
            </Text>
          </View>
          <View style={styles.positionInfo}>
            <View style={styles.positionNameRow}>
              <Text style={styles.positionPlanetName}>{position.planetName}</Text>
              {position.retrograde ? (
                <View style={styles.rxBadge}>
                  <Text style={styles.rxBadgeText}>Rx</Text>
                </View>
              ) : null}
              {position.meaning ? (
                <Text style={styles.positionMeaning} numberOfLines={1}>
                  {position.meaning}
                </Text>
              ) : null}
            </View>
            <View style={styles.positionSignRow}>
              <Text style={styles.positionSign}>{position.signLabel}</Text>
              {position.houseLabel ? (
                <Text style={styles.positionHouse}>· {position.houseLabel}</Text>
              ) : null}
              {position.dignityLabel &&
              position.dignityBackgroundColor &&
              position.dignityTextColor ? (
                <View
                  style={[
                    styles.dignityBadge,
                    { backgroundColor: position.dignityBackgroundColor },
                  ]}
                >
                  <Text style={[styles.dignityBadgeText, { color: position.dignityTextColor }]}>
                    {position.dignityLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            {position.keyword ? (
              <Text style={styles.positionKeyword} numberOfLines={1}>
                {position.keyword}
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      {angles.length > 0 ? (
        <View style={styles.anglesStrip}>
          {angles.map((angle) => (
            <View key={angle.id} style={styles.angleRow}>
              <View style={[styles.planetSymbol, { backgroundColor: colors.primaryTint }]}>
                <Text style={[styles.planetSymbolText, { color: colors.primary }]}>
                  {angle.shortLabel}
                </Text>
              </View>
              <View style={styles.positionInfo}>
                <Text style={styles.positionPlanetName} numberOfLines={1}>
                  {angle.label}
                </Text>
                <Text style={styles.positionSign}>{angle.signLabel}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
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
  });
}
