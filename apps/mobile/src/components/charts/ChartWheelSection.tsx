import { StyleSheet, Text, View } from 'react-native';
import type { WheelAspect, WheelPosition } from '@/components/ChartWheel';
import { ChartWheel } from '@/components/ChartWheel';
import { cardShadow, useColors } from '@/lib/colors';

interface ChartWheelSectionProps {
  title: string;
  positions: WheelPosition[];
  aspects: WheelAspect[];
  houseSystem: string;
}

export function ChartWheelSection({
  title,
  positions,
  aspects,
  houseSystem,
}: ChartWheelSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  if (positions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.wheelContainer}>
        <ChartWheel positions={positions} aspects={aspects} houseSystem={houseSystem} />
      </View>
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
    wheelContainer: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      ...cardShadow,
    },
  });
}
