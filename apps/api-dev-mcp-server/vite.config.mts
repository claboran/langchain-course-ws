/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { resolve } from 'path';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/api-dev-mcp-server',

  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],

  // Build configuration for Node.js
  build: {
    outDir: '../../dist/apps/api-dev-mcp-server',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Enable SSR mode for Node.js backend
    ssr: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/main.ts'),
        'main-sse': resolve(import.meta.dirname, 'src/main-sse.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
      external: [
        // Mark all node_modules as external to avoid bundling
        /node_modules/,
      ],
    },
  },

  // SSR-specific configuration
  ssr: {
    noExternal: false, // Don't bundle dependencies for MCP server
  },

  // Test configuration for Vitest
  test: {
    name: 'api-dev-mcp-server',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/api-dev-mcp-server',
      provider: 'v8' as const,
    },
  },
});
