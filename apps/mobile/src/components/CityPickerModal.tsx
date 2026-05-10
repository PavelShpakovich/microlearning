import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';
import { useLocale } from '@/lib/locale-context';
import { locationsApi } from '@clario/api-client';
import type { CityOption } from '@clario/api-client';

interface Props {
  visible: boolean;
  /** Display name of the currently selected city, used to show a checkmark. */
  value: string;
  title: string;
  placeholder: string;
  emptyText: string;
  onSelect: (city: CityOption) => void;
  onClose: () => void;
}

export function CityPickerModal({
  visible,
  value,
  title,
  placeholder,
  emptyText,
  onSelect,
  onClose,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { locale } = useLocale();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityOption[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await locationsApi.searchCities(query, locale);
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(city: CityOption) {
    onSelect(city);
    setQuery('');
    setResults([]);
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
          <Text style={styles.title}>{title}</Text>
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
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoFocus
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Results list */}
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.lat}-${item.lon}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = value === item.displayName;
            return (
              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[styles.itemText, selected && styles.itemTextSelected]}
                  numberOfLines={2}
                >
                  {item.displayName}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.length >= 2 && !searching ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{emptyText}</Text>
              </View>
            ) : null
          }
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
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      gap: 8,
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
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    itemPressed: {
      backgroundColor: colors.muted,
    },
    itemText: {
      flex: 1,
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
      marginHorizontal: 20,
    },
    empty: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
  });
}
