import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdminUser } from '@clario/api-client';
import { cardShadow, useColors } from '@/lib/colors';

interface AdminUserRowCardProps {
  user: AdminUser;
  onGrant: () => void;
  onRevoke: () => void;
  onToggleAdmin: () => void;
  onDelete: () => void;
  creditForm?: ReactNode;
}

export function AdminUserRowCard({
  user,
  onGrant,
  onRevoke,
  onToggleAdmin,
  onDelete,
  creditForm,
}: AdminUserRowCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.userCard}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, user.isAdmin && styles.avatarAdmin]}>
          <Text style={[styles.avatarText, user.isAdmin && styles.avatarTextAdmin]}>
            {initials(user.displayName)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.displayName || '\u2014'}
            </Text>
            {user.isAdmin ? (
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>admin</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email ?? '\u2014'}
          </Text>
          <View style={styles.userStats}>
            <View style={styles.statChip}>
              <Ionicons name="star-outline" size={11} color={colors.primary} />
              <Text style={styles.statChipText}>{user.creditBalance}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="book-outline" size={11} color={colors.mutedForeground} />
              <Text style={styles.statChipText}>{user.totalReadings}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="disc-outline" size={11} color={colors.mutedForeground} />
              <Text style={styles.statChipText}>{user.totalCharts}</Text>
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onGrant} hitSlop={6}>
            <Ionicons name="add-circle-outline" size={22} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onRevoke} hitSlop={6}>
            <Ionicons name="remove-circle-outline" size={22} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onToggleAdmin} hitSlop={6}>
            <Ionicons
              name={user.isAdmin ? 'shield' : 'shield-outline'}
              size={22}
              color={user.isAdmin ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete} hitSlop={6}>
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
      {creditForm}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    userCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 8,
      ...cardShadow,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarAdmin: { backgroundColor: colors.primaryTint },
    avatarText: { fontSize: 15, fontWeight: '700', color: colors.mutedForeground },
    avatarTextAdmin: { color: colors.primary },
    userInfo: { flex: 1, gap: 2 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName: { fontSize: 14, fontWeight: '600', color: colors.foreground, flexShrink: 1 },
    adminPill: {
      backgroundColor: colors.primarySubtle,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    adminPillText: { fontSize: 10, fontWeight: '700', color: colors.primary },
    userEmail: { fontSize: 12, color: colors.mutedForeground },
    userStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statChipText: { fontSize: 11, color: colors.mutedForeground },
    userActions: { flexDirection: 'row', gap: 2 },
    actionBtn: { padding: 6 },
  });
}
