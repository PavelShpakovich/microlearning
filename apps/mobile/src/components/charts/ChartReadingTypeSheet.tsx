import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/lib/colors';

interface ChartReadingTypeSheetProps {
  visible: boolean;
  title: string;
  cancelLabel: string;
  readingTypes: readonly string[];
  readingTypeLabels: Record<string, string>;
  creatingReading: string | null;
  onSelectType: (readingType: string) => void;
  onClose: () => void;
}

export function ChartReadingTypeSheet({
  visible,
  title,
  cancelLabel,
  readingTypes,
  readingTypeLabels,
  creatingReading,
  onSelectType,
  onClose,
}: ChartReadingTypeSheetProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          {readingTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.modalItem}
              onPress={() => onSelectType(type)}
              disabled={creatingReading !== null}
            >
              {creatingReading === type ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.modalItemText}>{readingTypeLabels[type] ?? type}</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      gap: 4,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    modalItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'flex-start',
    },
    modalItemText: {
      fontSize: 15,
      color: colors.foreground,
    },
    modalCancel: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    modalCancelText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontWeight: '500',
    },
  });
}
