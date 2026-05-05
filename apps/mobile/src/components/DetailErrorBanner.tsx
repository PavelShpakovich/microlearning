import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/lib/colors';

type DetailErrorBannerVariant = 'detail' | 'compact';

interface DetailErrorBannerProps {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  retrying?: boolean;
  variant?: DetailErrorBannerVariant;
  centered?: boolean;
}

export function DetailErrorBanner({
  title,
  description,
  retryLabel,
  onRetry,
  retrying = false,
  variant = 'detail',
  centered = true,
}: DetailErrorBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const compact = variant === 'compact';

  return (
    <View
      style={[
        styles.banner,
        compact ? styles.bannerCompact : styles.bannerDetail,
        centered && styles.bannerCentered,
      ]}
    >
      <Text
        style={[
          styles.title,
          compact ? styles.titleCompact : styles.titleDetail,
          centered && styles.centerText,
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          compact ? styles.descriptionCompact : styles.descriptionDetail,
          centered && styles.centerText,
        ]}
      >
        {description}
      </Text>
      {retryLabel && onRetry ? (
        <TouchableOpacity
          style={[styles.retryButton, retrying && styles.buttonDisabled]}
          onPress={onRetry}
          disabled={retrying}
        >
          {retrying ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    banner: {
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: colors.destructiveSubtle,
      gap: 8,
    },
    bannerDetail: {
      borderColor: '#fca5a5',
      padding: 16,
      marginBottom: 20,
    },
    bannerCompact: {
      borderColor: `${colors.destructive}50`,
      padding: 14,
      gap: 4,
    },
    bannerCentered: {
      alignItems: 'center',
    },
    title: {
      fontWeight: '600',
      color: colors.destructive,
    },
    titleDetail: {
      fontSize: 14,
    },
    titleCompact: {
      fontSize: 13,
    },
    description: {
      color: colors.mutedForeground,
    },
    descriptionDetail: {
      fontSize: 13,
      lineHeight: 19,
    },
    descriptionCompact: {
      fontSize: 12,
    },
    centerText: {
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.primary,
      height: 36,
      borderRadius: 8,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    retryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
