# Buildable Libraries in Nx Monorepo

## Overview

This workspace uses **buildable libraries** with AnalogJS applications. This document explains the architecture, configuration, and workflow for working with shared libraries.

## Architecture

### The Challenge

AnalogJS dev server runs API routes (h3/Nitro) in **Node.js runtime**, which:
- Cannot resolve TypeScript path mappings (`@langchain-course-ws/*`)
- Doesn't understand `tsconfig.base.json` paths
- Requires actual files in `node_modules` or resolvable paths

### The Solution

We use **npm workspaces** to create Node.js-resolvable symlinks from built library outputs:

```
node_modules/@langchain-course-ws/communication -> dist/libs/communication
node_modules/@langchain-course-ws/model-provider -> dist/libs/model-provider
```

## Configuration

### 1. NPM Workspaces (`package.json`)

```json
{
  "workspaces": [
    "dist/libs/*"
  ]
}
```

**Critical**: Points to `dist/libs/*` (built output), not `libs/*` (source).

### 2. Auto-Build Dependencies (`nx.json`)

```json
{
  "targetDefaults": {
    "@analogjs/platform:vite-dev-server": {
      "dependsOn": ["^build"]
    }
  }
}
```

Ensures libraries are built before serving applications.

### 3. SSR Configuration (`apps/*/vite.config.ts`)

```typescript
export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: {
        '@langchain-course-ws/communication': '../../libs/communication/src/index.ts',
        '@langchain-course-ws/model-provider': '../../libs/model-provider/src/index.ts',
        '@langchain-course-ws/chat-components': '../../libs/chat-components/src/index.ts',
      },
    },
    ssr: {
      noExternal: ['@langchain-course-ws/**'],  // Bundle all workspace libs for SSR
    },
    plugins: [
      nxViteTsPaths(),  // Must be first - resolves paths
      tailwindcss(),
      analog({
        nitro: {
          externals: {
            inline: ['@langchain-course-ws/**'],
          },
        },
      })
    ],
  };
});
```

### 4. Path Mappings (`tsconfig.base.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@langchain-course-ws/communication": ["libs/communication/src/index.ts"],
      "@langchain-course-ws/model-provider": ["libs/model-provider/src/index.ts"],
      "@langchain-course-ws/chat-components": ["libs/chat-components/src/index.ts"]
    }
  }
}
```

Points to **source files** for IDE/TypeScript (instant feedback).

## How It Works

### Development Flow

```bash
nx serve chat-ui
```

**What happens:**
1. ✅ Nx builds `communication` library (via `dependsOn: ["^build"]`)
   - Output: `dist/libs/communication/src/index.js`
2. ✅ npm workspace creates symlink:
   - `node_modules/@langchain-course-ws/communication` → `dist/libs/communication`
3. ✅ Vite dev server starts
4. ✅ Nitro bundles server routes:
   - `import { ... } from '@langchain-course-ws/communication'`
5. ✅ Node.js resolves via symlink in `node_modules`
6. ✅ Server routes work! 🎉

### Production Build

```bash
nx build chat-ui
```

**What happens:**
1. ✅ Builds dependent libraries
2. ✅ Vite bundles everything into `main.server.js`
3. ✅ No runtime imports needed (fully bundled)

## Developer Workflows

### Starting Dev Server

```bash
# Automatic - libraries build first
nx serve chat-ui

# Or use npm scripts
npm run chat-ui:dev
```

### Adding a New Buildable Library

1. **Generate the library:**
   ```bash
   nx g @nx/js:library my-lib --buildable --publishable
   ```

2. **Add to `tsconfig.base.json`:**
   ```json
   "@langchain-course-ws/my-lib": ["libs/my-lib/src/index.ts"]
   ```

3. **Add to `apps/*/vite.config.ts` resolve.alias:**
   ```typescript
   '@langchain-course-ws/my-lib': '../../libs/my-lib/src/index.ts',
   ```

4. **Build the library:**
   ```bash
   nx build my-lib
   ```

5. **Recreate workspace symlinks:**
   ```bash
   npm install --legacy-peer-deps
   ```

6. **Verify symlink created:**
   ```bash
   ls -la node_modules/@langchain-course-ws/my-lib
   # Should show: my-lib -> ../../dist/libs/my-lib
   ```

### Making Changes to a Library

**During development:**
- Source changes are picked up by TypeScript/IDE immediately
- For **runtime changes** in dev server, rebuild the library:
  ```bash
  nx build communication
  # Dev server will pick up changes on next request
  ```

**Automatic rebuild:**
```bash
# Watch mode (in separate terminal)
nx build communication --watch
```

## Import Guidelines

### ✅ Correct - Use Path Mappings

```typescript
// In apps/*/src/server/routes/**/*.ts
import { safeParseOrThrow } from '@langchain-course-ws/communication';
```

### ❌ Incorrect - Relative Paths

```typescript
// DON'T do this
import { safeParseOrThrow } from '../../../../../libs/communication/src/index';
```

## Troubleshooting

### Issue: "Cannot find package '@langchain-course-ws/communication'"

**Symptoms:**
```
Cannot find package '@langchain-course-ws/communication'
imported from .../dist/apps/chat-ui/.nitro/dev/index.mjs
```

**Solution:**
1. Build the library:
   ```bash
   nx build communication
   ```

2. Recreate workspace symlinks:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Verify symlink exists:
   ```bash
   ls -la node_modules/@langchain-course-ws/communication
   # Should point to: ../../dist/libs/communication
   ```

### Issue: Changes Not Reflected in Dev Server

**Solution:**
Rebuild the library and restart dev server:
```bash
nx build communication
# Restart: nx serve chat-ui
```

Or use watch mode:
```bash
# Terminal 1
nx build communication --watch

# Terminal 2
nx serve chat-ui
```

### Issue: TypeScript Can't Find Module

**Check:**
1. Path mapping exists in `tsconfig.base.json`
2. Library is exported in `libs/*/src/index.ts`
3. VSCode/IDE has reloaded TypeScript server

## Library Structure

Each buildable library should have:

```
libs/communication/
├── src/
│   ├── index.ts          # Public API exports
│   └── lib/
│       └── utils.ts      # Implementation
├── package.json          # Must have "main" and "types" fields
├── project.json          # Nx build configuration
├── tsconfig.lib.json     # Library TypeScript config
└── README.md             # Library documentation
```

### Library `package.json` Example

```json
{
  "name": "@langchain-course-ws/communication",
  "version": "0.0.1",
  "private": true,
  "type": "commonjs",
  "main": "./src/index.js",       // Points to built .js file
  "types": "./src/index.d.ts",    // Points to built .d.ts file
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

**Important**: `main` and `types` point to files that will exist **after build** in `dist/libs/communication/src/`.

## Benefits

✅ **Type Safety**: IDE resolves to source files for instant feedback
✅ **Build Caching**: Nx caches library builds, only rebuilds when changed
✅ **SSR Compatible**: Works in both dev and production
✅ **Scalable**: Easy to add new libraries
✅ **Isolated**: Libraries can be tested independently

## References

- [Nx Buildable Libraries](https://nx.dev/concepts/buildable-and-publishable-libraries)
- [AnalogJS Documentation](https://analogjs.org)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Vite SSR](https://vitejs.dev/guide/ssr.html)
