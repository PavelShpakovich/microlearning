import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Block server-only imports in tests
    '^server-only$': '<rootDir>/src/__mocks__/server-only.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  /**
   * Only collect coverage from testable business-logic modules.
   * Excluded intentionally:
   *   - supabase/types.ts      (1100-line auto-generated schema, not testable)
   *   - supabase/admin|client  (DB client boilerplate, requires real Supabase)
   *   - lib/email              (requires live Resend API)
   *   - lib/auth               (requires NextAuth + Supabase sessions)
   *   - lib/readings/service   (requires LLM + DB, tested via integration)
   *   - lib/llm/structured-generation (makes real API calls)
   *   - lib/api                (thin passthrough utilities)
   *   - lib/ingestion          (file-processing, covered separately)
   *   - env.ts                 (validated at startup, no unit logic)
   */
  collectCoverageFrom: [
    'src/lib/astrology/engine.ts',
    'src/lib/astrology/chart-schema.ts',
    'src/lib/cities/**/*.ts',
    'src/lib/llm/structured-output.ts',
    'src/lib/errors.ts',
    'src/lib/access-utils.ts',
    'src/lib/usage-policy.ts',
    'src/lib/rate-limit.ts',
    'src/lib/utils.ts',
    '!src/lib/**/*.d.ts',
  ],
};

export default createJestConfig(config);
