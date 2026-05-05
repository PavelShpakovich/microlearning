import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/colors';

interface InlineErrorBannerProps {
  message: string;
}

export function InlineErrorBanner({ message }: InlineErrorBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    errorBanner: {
      backgroundColor: colors.destructiveSubtle,
      borderColor: colors.destructive,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    errorBannerText: {
      fontSize: 13,
      color: colors.destructive,
    },
  });
}
