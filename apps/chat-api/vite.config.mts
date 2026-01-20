/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import swc from 'unplugin-swc';
import { resolve } from 'path';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/chat-api',

  server: {
    port: 3311,
    host: 'localhost',
  },

  preview: {
    port: 3312,
    host: 'localhost',
  },

  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: 'es2021',
      },
    }),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md'])
  ],

  // Build configuration for Node.js
  build: {
    outDir: '../../dist/chat-api',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Enable SSR mode for Node.js backend
    ssr: true,
    rollupOptions: {
      // Use absolute path for entry point
      input: resolve(import.meta.dirname, 'src/main.ts'),
      output: {
        entryFileNames: '[name].js',
      },
    },
  },

  // SSR-specific configuration
  ssr: {
    noExternal: true, // Bundle all dependencies
  },

  // Test configuration for Vitest
  test: {
    name: 'chat-api',
    watch: false,
    globals: true,
    environment: 'node', // Use Node.js environment for tests
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/chat-api',
      provider: 'v8' as const,
    },
  },
});
