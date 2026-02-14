# Troubleshooting Guide

Common issues and solutions for the LangChain Course Workspace.

## Buildable Libraries Issues

### ❌ "Cannot find package '@langchain-course-ws/communication'"

**Error:**
```
Cannot find package '@langchain-course-ws/communication'
imported from /home/.../dist/apps/chat-ui/.nitro/dev/index.mjs
```

**Root Cause:**
Node.js runtime cannot resolve the workspace package.

**Solution:**

1. **Build the library:**
   ```bash
   nx build communication
   ```

2. **Recreate workspace symlinks:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Verify symlink exists:**
   ```bash
   ls -la node_modules/@langchain-course-ws/
   # Should show: communication -> ../../dist/libs/communication
   ```

4. **Restart dev server:**
   ```bash
   nx serve chat-ui
   ```

---

### ❌ "Cannot find module './src/index.js'"

**Error:**
```
Cannot find package '.../node_modules/@langchain-course-ws/communication/src/index.js'
```

**Root Cause:**
Workspace symlink points to source directory (`libs/`) instead of build output (`dist/libs/`).

**Solution:**

Verify `package.json` has correct workspace configuration:
```json
{
  "workspaces": [
    "dist/libs/*"    // ✅ Correct - points to built output
    // NOT "libs/*"  // ❌ Wrong - points to source
  ]
}
```

Then reinstall:
```bash
npm install --legacy-peer-deps
```

---

### ❌ Changes to Library Not Reflected in Dev Server

**Symptom:**
You make changes to `libs/communication/src/lib/utils.ts` but don't see them in the running app.

**Root Cause:**
The library needs to be rebuilt for changes to take effect.

**Solution:**

**Option 1: Manual Rebuild**
```bash
nx build communication
# Changes will be picked up on next request
```

**Option 2: Watch Mode** (Recommended)
```bash
# Terminal 1: Watch and rebuild library
nx build communication --watch

# Terminal 2: Run dev server
nx serve chat-ui
```

---

### ❌ TypeScript Cannot Find Module

**Error in IDE:**
```
Cannot find module '@langchain-course-ws/communication' or its corresponding type declarations.
```

**Solution:**

1. **Check path mapping exists** in `tsconfig.base.json`:
   ```json
   {
     "paths": {
       "@langchain-course-ws/communication": ["libs/communication/src/index.ts"]
     }
   }
   ```

2. **Verify export in library** (`libs/communication/src/index.ts`):
   ```typescript
   export * from './lib/utils';
   ```

3. **Reload TypeScript in VSCode:**
   - Open Command Palette (Cmd/Ctrl + Shift + P)
   - Type: "TypeScript: Restart TS Server"

---

## Nx Workspace Issues

### ❌ "Nx daemon not running"

**Solution:**
```bash
nx reset
nx daemon --start
```

---

### ❌ Build Cache Issues

**Symptom:**
Changes not reflected or stale build outputs.

**Solution:**
```bash
# Clear all caches
nx reset

# Clear specific project
nx reset chat-ui
```

---

## Development Server Issues

### ❌ Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::4200
```

**Solution:**

Find and kill the process:
```bash
# Linux/Mac
lsof -ti:4200 | xargs kill -9

# Or use a different port
nx serve chat-ui --port 4201
```

---

### ❌ Vite Optimization Errors

**Error:**
```
[vite] error while updating dependencies
```

**Solution:**

Clear Vite cache:
```bash
rm -rf node_modules/.vite
nx serve chat-ui
```

---

## Database Issues (E-Commerce Assistant)

### ❌ "Connection refused to PostgreSQL"

**Solution:**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

3. **Verify connection:**
   ```bash
   docker exec -it langchain-postgres psql -U postgres -d ecommerce
   ```

---

### ❌ "Relation 'products' does not exist"

**Root Cause:**
Database migrations haven't been run.

**Solution:**
```bash
npm run product-ingest:migrate
```

---

## API Connection Issues

### ❌ "Connect Timeout Error: localhost:3311"

**Error:**
```
ConnectTimeoutError: Connect Timeout Error (attempted address: localhost:3311)
```

**Root Cause:**
Backend API is not running.

**Solution:**

Start the backend:
```bash
# Chat API
nx serve chat-api

# Or E-commerce API
nx serve ecommerce-assistant-api
```

---

### ❌ "MISTRAL_API_KEY is not set"

**Solution:**

Create `.env` file in project root:
```bash
MISTRAL_API_KEY=your_api_key_here
```

Restart the backend service.

---

## npm Installation Issues

### ❌ Peer Dependency Conflicts

**Error:**
```
npm error ERESOLVE could not resolve
```

**Solution:**

Use legacy peer deps:
```bash
npm install --legacy-peer-deps
```

This is required due to LangChain ecosystem dependencies.

---

## Still Having Issues?

1. **Check the logs:**
   ```bash
   # Backend logs
   nx serve chat-api --verbose

   # Frontend logs
   nx serve chat-ui --verbose
   ```

2. **Clean everything:**
   ```bash
   # Remove all build artifacts
   rm -rf dist node_modules/.vite node_modules/.cache

   # Rebuild
   npm install --legacy-peer-deps
   nx reset
   ```

3. **Verify environment:**
   ```bash
   node --version   # Should be v18+
   npm --version
   nx --version
   ```

4. **Check documentation:**
   - [Buildable Libraries](./BUILDABLE_LIBRARIES.md)
   - [Nx Documentation](https://nx.dev)
   - [AnalogJS Docs](https://analogjs.org)

5. **Create an issue:**
   If problem persists, create a GitHub issue with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment details (`node --version`, OS)
   - Relevant logs
