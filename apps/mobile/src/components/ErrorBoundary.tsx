import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { allMessages } from '@clario/i18n';
import { getLocale } from '@/lib/i18n';
import { useColors, colors as staticColors } from '@/lib/colors';

// Module-level styles for the class component (uses static light theme)
const styles = createStyles(staticColors);

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  override render() {
    if (this.state.hasError) {
      const currentMessages = allMessages[getLocale()];
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{currentMessages.errors.generic as string}</Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>
              {currentMessages.readingGenerating.retryButton as string}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: colors.background,
      gap: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    buttonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
