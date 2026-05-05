import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/components/Skeleton';
import { cardShadow, useColors } from '@/lib/colors';
import { useTranslations } from '@/lib/i18n';

interface LlmConfigResponse {
  primary: string;
  fallback: string | null;
}

interface AdminLlmSectionProps {
  loadConfigRequest: () => Promise<LlmConfigResponse>;
  switchProviderRequest: (providerId: string) => Promise<LlmConfigResponse>;
}

export function AdminLlmSection({
  loadConfigRequest,
  switchProviderRequest,
}: AdminLlmSectionProps) {
  const t = useTranslations('adminLlm');
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [primary, setPrimary] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setError(null);
      const data = await loadConfigRequest();
      setPrimary(data.primary);
      setFallback(data.fallback);
    } catch (err) {
      console.error('Failed to load LLM config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [loadConfigRequest]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const switchProvider = async (id: string) => {
    setSwitching(true);
    try {
      const data = await switchProviderRequest(id);
      setPrimary(data.primary);
      setFallback(data.fallback);
    } catch (err) {
      console.error('Failed to switch provider:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View style={[styles.card, { marginTop: 12 }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="flash-outline" size={15} color={colors.primary} />
        <Text style={styles.cardTitle}>{t('title')}</Text>
      </View>
      {loading ? (
        <Skeleton style={{ height: 40, borderRadius: 8 }} />
      ) : error ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: colors.destructive }}>Error: {error}</Text>
          <TouchableOpacity
            onPress={() => void loadConfig()}
            style={[styles.llmProviderBtn, { justifyContent: 'center' }]}
          >
            <Text style={styles.llmProviderBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['qwen', 'deepseek'] as const).map((id) => {
              const isActive = primary === id;
              return (
                <TouchableOpacity
                  key={id}
                  disabled={switching}
                  onPress={() => void switchProvider(id)}
                  style={[
                    styles.llmProviderBtn,
                    isActive && styles.llmProviderBtnActive,
                    switching && styles.btnDisabled,
                  ]}
                >
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={15} color={colors.primaryForeground} />
                  ) : null}
                  <Text
                    style={[styles.llmProviderBtnText, isActive && styles.llmProviderBtnTextActive]}
                  >
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {fallback ? (
            <Text style={styles.llmFallbackText}>{t('fallbackInfo', { id: fallback })}</Text>
          ) : null}
        </>
      )}
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
    llmProviderBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    llmProviderBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    llmProviderBtnText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    llmProviderBtnTextActive: {
      color: colors.primaryForeground,
    },
    llmFallbackText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    btnDisabled: {
      opacity: 0.5,
    },
  });
}
