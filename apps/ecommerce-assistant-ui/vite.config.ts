/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    root: __dirname,
    cacheDir: `../../node_modules/.vite`,
    resolve: {
      alias: {
        '@langchain-course-ws/communication': resolve(__dirname, '../../libs/communication/src/index.ts'),
        '@langchain-course-ws/model-provider': resolve(__dirname, '../../libs/model-provider/src/index.ts'),
        '@langchain-course-ws/chat-components': resolve(__dirname, '../../libs/chat-components/src/index.ts'),
      },
    },
    build: {
      outDir: '../../dist/apps/ecommerce-assistant-ui/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    server: {
      fs: {
        allow: [
          // Workspace root to allow access to libs
          resolve(__dirname, '../../'),
        ],
      },
    },
    ssr: {
      noExternal: ['@langchain-course-ws/**'],
    },
    plugins: [
      nxViteTsPaths(),
      tailwindcss(),
      analog({
        nitro: {
          externals: {
            inline: ['@langchain-course-ws/**'],
          },
        },
      })
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
