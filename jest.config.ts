import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      lines: 70,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Block server-only imports in tests
    '^server-only$': '<rootDir>/src/__mocks__/server-only.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/*.d.ts', '!src/lib/**/index.ts'],
};

export default createJestConfig(config);
