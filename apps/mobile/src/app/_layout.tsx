import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureApiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermissions } from '@/lib/notifications';
import { initializeLocale } from '@/lib/i18n';
import { LocaleProvider, initializeLocaleFromStorage } from '@/lib/locale-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ConfirmDialogProvider } from '@/components/ConfirmDialog';
import { SplashAnimation } from '@/components/SplashAnimation';
import { useColors } from '@/lib/colors';
import { ThemeProvider } from '@/lib/theme-context';
import { toastConfig } from '@/lib/toastConfig';
import { InsufficientCreditsProvider } from '@/lib/insufficient-credits-context';

export default function RootLayout() {
  const themeColors = useColors();
  const isDark = useColorScheme() === 'dark';
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Initialize i18n: detect device language and load saved preference
    initializeLocale();
    void initializeLocaleFromStorage();

    configureApiClient();
    void requestNotificationPermissions();

    async function init() {
      // Await the initial URL BEFORE subscribing to auth state.
      // Linking.getInitialURL() is cached after the first native call so it
      // resolves near-instantly on subsequent calls — no perceptible delay.
      // This guarantees urlRef has the launch URL when INITIAL_SESSION fires
      // synchronously inside onAuthStateChange, preventing a false login
      // redirect when the app is cold-started via a password-reset deep link.
      const initialUrl = (await Linking.getInitialURL()) ?? '';

      const isAuthCallback =
        initialUrl.includes('auth/callback') &&
        (initialUrl.includes('access_token') || initialUrl.includes('code'));

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (!session && !isAuthCallback) {
            router.replace('/(auth)/login');
          }
          setAuthReady(true);
        }
        if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/login');
        }
        if (event === 'PASSWORD_RECOVERY') {
          router.replace('/(auth)/set-password');
        }
        if (event === 'USER_UPDATED' && session) {
          router.replace('/');
        }
      });

      subscriptionRef.current = subscription;
    }

    void init();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocaleProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <ConfirmDialogProvider>
              <InsufficientCreditsProvider>
                <View style={{ flex: 1 }}>
                  <OfflineBanner />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      gestureEnabled: true,
                      contentStyle: { backgroundColor: themeColors.background },
                    }}
                  />
                  <StatusBar style={isDark ? 'light' : 'auto'} />
                  {(!authReady || !splashDone) && (
                    <SplashAnimation onDone={() => setSplashDone(true)} />
                  )}
                </View>
                <Toast position="bottom" bottomOffset={32} config={toastConfig} />
              </InsufficientCreditsProvider>
            </ConfirmDialogProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
