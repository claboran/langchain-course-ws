import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * Configuration for integration tests using testcontainers
 * Run with: vitest --config=vitest.integration.config.ts
 */
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vitest/apps/api-dev-assistant-api-integration',
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    // Only run integration tests
    include: ['src/**/*.integration.spec.ts'],
    reporters: ['default'],
    // Longer timeouts for container startup
    testTimeout: 60000,
    hookTimeout: 120000,
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/api-dev-assistant-api-integration',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.spec.ts',
        'src/**/*.integration.spec.ts',
        'src/generated/**',
        'src/main.ts',
      ],
    },
  },
});
