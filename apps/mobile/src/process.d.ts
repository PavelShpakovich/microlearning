// Expo Metro bundler replaces process.env.EXPO_PUBLIC_* at build time.
// This declaration satisfies TypeScript in files that access process.env directly.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?: string;
    EXPO_PUBLIC_REVENUECAT_ENVIRONMENT?: 'sandbox' | 'production';
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  };
};
