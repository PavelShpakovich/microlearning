import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/colors';

interface ChartAspectItem {
  id: string;
  symbol: string;
  symbolColor: string;
  symbolBackgroundColor: string;
  planetsLabel: string;
  metaLabel: string;
}

interface ChartAspectsSectionProps {
  title: string;
  aspects: ChartAspectItem[];
}

export function ChartAspectsSection({ title, aspects }: ChartAspectsSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  if (aspects.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {aspects.map((aspect) => (
        <View key={aspect.id} style={styles.aspectRow}>
          <View style={[styles.aspectSymbolBox, { backgroundColor: aspect.symbolBackgroundColor }]}>
            <Text style={[styles.aspectSymbol, { color: aspect.symbolColor }]}>
              {aspect.symbol}
            </Text>
          </View>
          <View style={styles.aspectInfo}>
            <Text style={styles.aspectPlanets}>{aspect.planetsLabel}</Text>
            <Text style={styles.aspectMeta}>{aspect.metaLabel}</Text>
          </View>
        </View>
      ))}
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
  });
}
