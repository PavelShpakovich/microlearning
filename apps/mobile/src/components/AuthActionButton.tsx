import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/lib/colors';

type AuthActionButtonVariant = 'primary' | 'secondary';
type AuthActionButtonLoadingMode = 'text' | 'spinner';

interface AuthActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: AuthActionButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  loadingMode?: AuthActionButtonLoadingMode;
  style?: StyleProp<ViewStyle>;
}

export function AuthActionButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  loadingLabel,
  loadingMode = 'text',
  style,
}: AuthActionButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading && loadingMode === 'spinner' ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.primary}
        />
      ) : (
        <Text style={variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    button: {
      borderRadius: 8,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 1,
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
