import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow, useColors } from '@/lib/colors';

interface AdminUsersHeaderCardProps {
  title: string;
  total: number;
  search: string;
  placeholder: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}

export function AdminUsersHeaderCard({
  title,
  total,
  search,
  placeholder,
  onSearchChange,
  onClearSearch,
}: AdminUsersHeaderCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="people-outline" size={15} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
        {total > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{total}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={onClearSearch} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      ...cardShadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    countPill: {
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    countPillText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '600',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      gap: 8,
      height: 42,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
    },
  });
}
