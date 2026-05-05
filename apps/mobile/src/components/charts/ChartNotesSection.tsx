import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/colors';

interface ChartNotesSectionProps {
  title: string;
  notes: string;
}

export function ChartNotesSection({ title, notes }: ChartNotesSectionProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.notesBlock}>
      <Text style={styles.notesLabel}>{title}</Text>
      <Text style={styles.notesText}>{notes}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    notesBlock: {
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    notesLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.mutedForeground,
    },
    notesText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 20,
    },
  });
}
