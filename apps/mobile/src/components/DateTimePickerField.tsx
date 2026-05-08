import { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';
import { useTranslations } from '@/lib/i18n';

type PickerMode = 'date' | 'time';

interface Props {
  mode: PickerMode;
  value: string;
  placeholder: string;
  title: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
}

function parsePickerDate(mode: PickerMode, value: string): Date {
  if (mode === 'date' && value) {
    const parsed = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (mode === 'time' && value) {
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const parsed = new Date();
      parsed.setHours(hours, minutes, 0, 0);
      return parsed;
    }
  }

  if (mode === 'date') {
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    return fallback;
  }

  const fallback = new Date();
  fallback.setSeconds(0, 0);
  return fallback;
}

function toStoredValue(mode: PickerMode, date: Date): string {
  if (mode === 'date') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toDisplayValue(mode: PickerMode, value: string): string {
  if (!value) return '';

  if (mode === 'date') {
    const parsed = parsePickerDate(mode, value);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }

  const parsed = parsePickerDate(mode, value);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export function DateTimePickerField({
  mode,
  value,
  placeholder,
  title,
  onChange,
  maximumDate,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tCommon = useTranslations('common');
  const [visible, setVisible] = useState(false);
  const [draftValue, setDraftValue] = useState(() => parsePickerDate(mode, value));

  const displayValue = toDisplayValue(mode, value);

  function handleOpen() {
    setDraftValue(parsePickerDate(mode, value));
    setVisible(true);
  }

  function handleClose() {
    setVisible(false);
    setDraftValue(parsePickerDate(mode, value));
  }

  function handleConfirm() {
    onChange(toStoredValue(mode, draftValue));
    setVisible(false);
  }

  // Android: native dialog handles its own OK/Cancel
  function handleAndroidChange(_: unknown, selectedDate?: Date) {
    setVisible(false);
    if (selectedDate) {
      onChange(toStoredValue(mode, selectedDate));
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.fieldButton} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={[styles.fieldButtonText, !displayValue && styles.fieldButtonPlaceholder]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {/* Android: show native dialog directly, no custom Modal */}
      {Platform.OS === 'android' && visible && (
        <DateTimePicker
          value={draftValue}
          mode={mode}
          display="default"
          maximumDate={mode === 'date' ? maximumDate : undefined}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS: custom bottom sheet Modal with spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          transparent={false}
          onRequestClose={handleClose}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleClose} hitSlop={8}>
                  <Text style={styles.modalActionText}>{tCommon('cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
                  <Text style={styles.modalActionText}>Готово</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={draftValue}
                  mode={mode}
                  display="spinner"
                  maximumDate={mode === 'date' ? maximumDate : undefined}
                  onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                    if (selectedDate) setDraftValue(selectedDate);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    fieldButton: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    fieldButtonText: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      marginRight: 8,
    },
    fieldButtonPlaceholder: {
      color: colors.placeholder,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'flex-end',
      backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.32)',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: Platform.OS === 'ios' ? 0 : 20,
      borderTopRightRadius: Platform.OS === 'ios' ? 0 : 20,
      overflow: 'hidden',
      borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
      borderTopColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 56,
    },
    modalActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    modalTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginHorizontal: 12,
    },
    pickerWrap: {
      alignItems: 'center',
      paddingVertical: 12,
    },
  });
}
