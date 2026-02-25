import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vitest/apps/api-dev-assistant-api',
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Separate integration tests from unit tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.spec.ts', // Exclude integration tests by default
    ],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/api-dev-assistant-api',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.integration.spec.ts',
        'src/generated/**',
        'src/main.ts',
      ],
    },
    // Increase timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
