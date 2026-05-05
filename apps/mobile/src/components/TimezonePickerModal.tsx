import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';

export const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: { en: 'Honolulu (UTC−10)', ru: 'Гонолулу (UTC−10)' } },
  { value: 'America/Anchorage', label: { en: 'Anchorage (UTC−9)', ru: 'Анкоридж (UTC−9)' } },
  {
    value: 'America/Los_Angeles',
    label: { en: 'Los Angeles (UTC−8)', ru: 'Лос-Анджелес (UTC−8)' },
  },
  { value: 'America/Denver', label: { en: 'Denver (UTC−7)', ru: 'Денвер (UTC−7)' } },
  { value: 'America/Chicago', label: { en: 'Chicago (UTC−6)', ru: 'Чикаго (UTC−6)' } },
  { value: 'America/New_York', label: { en: 'New York (UTC−5)', ru: 'Нью-Йорк (UTC−5)' } },
  { value: 'America/Toronto', label: { en: 'Toronto (UTC−5)', ru: 'Торонто (UTC−5)' } },
  { value: 'America/Sao_Paulo', label: { en: 'São Paulo (UTC−3)', ru: 'Сан-Паулу (UTC−3)' } },
  {
    value: 'America/Buenos_Aires',
    label: { en: 'Buenos Aires (UTC−3)', ru: 'Буэнос-Айрес (UTC−3)' },
  },
  { value: 'Atlantic/Azores', label: { en: 'Azores (UTC−1)', ru: 'Азорские о-ва (UTC−1)' } },
  { value: 'Europe/London', label: { en: 'London (UTC+0)', ru: 'Лондон (UTC+0)' } },
  { value: 'Europe/Lisbon', label: { en: 'Lisbon (UTC+0)', ru: 'Лиссабон (UTC+0)' } },
  { value: 'Europe/Berlin', label: { en: 'Berlin (UTC+1)', ru: 'Берлин (UTC+1)' } },
  { value: 'Europe/Paris', label: { en: 'Paris (UTC+1)', ru: 'Париж (UTC+1)' } },
  { value: 'Europe/Warsaw', label: { en: 'Warsaw (UTC+1)', ru: 'Варшава (UTC+1)' } },
  { value: 'Europe/Vilnius', label: { en: 'Vilnius (UTC+2)', ru: 'Вильнюс (UTC+2)' } },
  { value: 'Europe/Riga', label: { en: 'Riga (UTC+2)', ru: 'Рига (UTC+2)' } },
  { value: 'Europe/Tallinn', label: { en: 'Tallinn (UTC+2)', ru: 'Таллинн (UTC+2)' } },
  { value: 'Europe/Helsinki', label: { en: 'Helsinki (UTC+2)', ru: 'Хельсинки (UTC+2)' } },
  { value: 'Europe/Kyiv', label: { en: 'Kyiv (UTC+2)', ru: 'Киев (UTC+2)' } },
  { value: 'Europe/Bucharest', label: { en: 'Bucharest (UTC+2)', ru: 'Бухарест (UTC+2)' } },
  { value: 'Europe/Athens', label: { en: 'Athens (UTC+2)', ru: 'Афины (UTC+2)' } },
  { value: 'Africa/Cairo', label: { en: 'Cairo (UTC+2)', ru: 'Каир (UTC+2)' } },
  {
    value: 'Africa/Johannesburg',
    label: { en: 'Johannesburg (UTC+2)', ru: 'Йоханнесбург (UTC+2)' },
  },
  { value: 'Europe/Kaliningrad', label: { en: 'Kaliningrad (UTC+2)', ru: 'Калининград (UTC+2)' } },
  { value: 'Europe/Minsk', label: { en: 'Minsk (UTC+3)', ru: 'Минск (UTC+3)' } },
  { value: 'Europe/Moscow', label: { en: 'Moscow (UTC+3)', ru: 'Москва (UTC+3)' } },
  { value: 'Europe/Istanbul', label: { en: 'Istanbul (UTC+3)', ru: 'Стамбул (UTC+3)' } },
  { value: 'Africa/Nairobi', label: { en: 'Nairobi (UTC+3)', ru: 'Найроби (UTC+3)' } },
  { value: 'Asia/Tbilisi', label: { en: 'Tbilisi (UTC+4)', ru: 'Тбилиси (UTC+4)' } },
  { value: 'Asia/Baku', label: { en: 'Baku (UTC+4)', ru: 'Баку (UTC+4)' } },
  { value: 'Asia/Yerevan', label: { en: 'Yerevan (UTC+4)', ru: 'Ереван (UTC+4)' } },
  { value: 'Asia/Dubai', label: { en: 'Dubai (UTC+4)', ru: 'Дубай (UTC+4)' } },
  { value: 'Asia/Tashkent', label: { en: 'Tashkent (UTC+5)', ru: 'Ташкент (UTC+5)' } },
  { value: 'Asia/Karachi', label: { en: 'Karachi (UTC+5)', ru: 'Карачи (UTC+5)' } },
  {
    value: 'Asia/Yekaterinburg',
    label: { en: 'Yekaterinburg (UTC+5)', ru: 'Екатеринбург (UTC+5)' },
  },
  { value: 'Asia/Kolkata', label: { en: 'Mumbai (UTC+5:30)', ru: 'Мумбаи (UTC+5:30)' } },
  { value: 'Asia/Almaty', label: { en: 'Almaty (UTC+6)', ru: 'Алматы (UTC+6)' } },
  { value: 'Asia/Omsk', label: { en: 'Omsk (UTC+6)', ru: 'Омск (UTC+6)' } },
  { value: 'Asia/Dhaka', label: { en: 'Dhaka (UTC+6)', ru: 'Дакка (UTC+6)' } },
  { value: 'Asia/Yangon', label: { en: 'Yangon (UTC+6:30)', ru: 'Янгон (UTC+6:30)' } },
  { value: 'Asia/Bangkok', label: { en: 'Bangkok (UTC+7)', ru: 'Бангкок (UTC+7)' } },
  { value: 'Asia/Krasnoyarsk', label: { en: 'Krasnoyarsk (UTC+7)', ru: 'Красноярск (UTC+7)' } },
  { value: 'Asia/Shanghai', label: { en: 'Shanghai (UTC+8)', ru: 'Шанхай (UTC+8)' } },
  { value: 'Asia/Hong_Kong', label: { en: 'Hong Kong (UTC+8)', ru: 'Гонконг (UTC+8)' } },
  { value: 'Asia/Singapore', label: { en: 'Singapore (UTC+8)', ru: 'Сингапур (UTC+8)' } },
  { value: 'Asia/Irkutsk', label: { en: 'Irkutsk (UTC+8)', ru: 'Иркутск (UTC+8)' } },
  { value: 'Australia/Perth', label: { en: 'Perth (UTC+8)', ru: 'Перт (UTC+8)' } },
  { value: 'Asia/Seoul', label: { en: 'Seoul (UTC+9)', ru: 'Сеул (UTC+9)' } },
  { value: 'Asia/Tokyo', label: { en: 'Tokyo (UTC+9)', ru: 'Токио (UTC+9)' } },
  { value: 'Asia/Yakutsk', label: { en: 'Yakutsk (UTC+9)', ru: 'Якутск (UTC+9)' } },
  { value: 'Australia/Sydney', label: { en: 'Sydney (UTC+10)', ru: 'Сидней (UTC+10)' } },
  { value: 'Australia/Melbourne', label: { en: 'Melbourne (UTC+10)', ru: 'Мельбурн (UTC+10)' } },
  { value: 'Asia/Vladivostok', label: { en: 'Vladivostok (UTC+10)', ru: 'Владивосток (UTC+10)' } },
  { value: 'Asia/Magadan', label: { en: 'Magadan (UTC+11)', ru: 'Магадан (UTC+11)' } },
  { value: 'Pacific/Auckland', label: { en: 'Auckland (UTC+12)', ru: 'Окленд (UTC+12)' } },
  { value: 'Asia/Kamchatka', label: { en: 'Kamchatka (UTC+12)', ru: 'Камчатка (UTC+12)' } },
  { value: 'UTC', label: { en: 'UTC', ru: 'UTC' } },
] as const;

const ALIASES: Record<string, string> = {
  'Europe/Kiev': 'Europe/Kyiv',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
};

export function normalizeTimezone(tz: string): string {
  return ALIASES[tz] ?? tz;
}

export function timezoneLabel(tz: string, locale: 'en' | 'ru' = 'ru'): string {
  const normalized = normalizeTimezone(tz);
  return TIMEZONES.find((t) => t.value === normalized)?.label[locale] ?? normalized;
}

interface Props {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  locale?: 'en' | 'ru';
}

export function TimezonePickerModal({ visible, value, onSelect, onClose, locale = 'ru' }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');

  const labels = {
    en: { title: 'Time Zone', search: 'Search…' },
    ru: { title: 'Часовой пояс', search: 'Поиск…' },
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter(
      (tz) =>
        tz.label.ru.toLowerCase().includes(q) ||
        tz.label.en.toLowerCase().includes(q) ||
        tz.value.toLowerCase().includes(q),
    );
  }, [query]);

  function handleSelect(tz: string) {
    onSelect(tz);
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{labels[locale].title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.placeholder} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={labels[locale].search}
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = normalizeTimezone(value) === item.value;
            return (
              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => handleSelect(item.value)}
              >
                <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                  {item.label[locale]}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    itemPressed: {
      backgroundColor: colors.muted,
    },
    itemText: {
      fontSize: 15,
      color: colors.foreground,
    },
    itemTextSelected: {
      color: colors.primary,
      fontWeight: '500',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 20,
    },
  });
}
