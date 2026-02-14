# Communication Library

A shared TypeScript library providing common utilities for API communication, validation, and error handling across the LangChain Course Workspace.

## 📦 What's Inside

This library extracts common patterns used by both the chat and e-commerce assistant applications, providing:

- **Validation utilities** for request/response data using Zod schemas
- **Error handling wrappers** for consistent API error responses
- **Type-safe utilities** for conversation ID validation

## 🔧 Utilities

### `safeParseOrThrow`

Validates data against a Zod schema and throws a structured h3 error on failure.

**Type Signature:**
```typescript
function safeParseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  opts?: {
    statusCode?: number;
    statusMessage?: string;
    message?: string
  }
): z.infer<S>
```

**Usage:**
```typescript
import { safeParseOrThrow } from '@langchain-course-ws/communication';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Throws a 400 error if validation fails
const user = safeParseOrThrow(UserSchema, req.body);

// Custom error handling
const user = safeParseOrThrow(UserSchema, req.body, {
  statusCode: 422,
  statusMessage: 'Invalid User Data',
  message: 'User validation failed',
});
```

**Error Response Structure:**
```typescript
{
  statusCode: 400,
  statusMessage: 'Validation Error',
  data: {
    message: 'Validation failed',
    errors: { /* Zod error tree */ }
  }
}
```

---

### `validateConversationIdOrThrow`

Validates a conversation ID against a UUID schema with helpful error messages.

**Type Signature:**
```typescript
function validateConversationIdOrThrow(
  conversationId: unknown,
  conversationIdSchema: z.ZodString,
  opts?: { paramName?: string }
): string
```

**Usage:**
```typescript
import { validateConversationIdOrThrow } from '@langchain-course-ws/communication';
import { z } from 'zod';

const ConversationIdSchema = z.string().uuid();

// Validates and returns the conversation ID
const id = validateConversationIdOrThrow(
  params.conversationId,
  ConversationIdSchema
);

// Custom parameter name for better error messages
const threadId = validateConversationIdOrThrow(
  params.threadId,
  ConversationIdSchema,
  { paramName: 'threadId' }
);
```

**Error Response:**
```typescript
{
  statusCode: 400,
  statusMessage: 'Bad Request',
  data: {
    message: 'conversationId must be a valid UUID'
  }
}
```

---

### `callWithErrorHandling`

Wraps async API calls with standardized error handling, converting API errors to h3 errors.

**Type Signature:**
```typescript
function callWithErrorHandling<T>(
  fn: () => Promise<T>,
  name?: string
): Promise<T>
```

**Usage:**
```typescript
import { callWithErrorHandling } from '@langchain-course-ws/communication';

// Wrap API client calls
const response = await callWithErrorHandling(
  () => apiClient.chatApi.newChat({ message, user }),
  'ChatAPI'
);

// Default name is 'API' if not provided
const data = await callWithErrorHandling(
  () => fetch('/api/data').then(r => r.json())
);
```

**Features:**
- Extracts status codes and error messages from Response objects
- Logs errors with contextual information
- Converts network/API errors to h3 errors for consistent handling
- Handles edge cases (missing status codes, text read failures, etc.)

**Error Response:**
```typescript
{
  statusCode: 500, // or extracted from response
  statusMessage: 'ChatAPI Error',
  data: {
    message: 'Failed to get response from ChatAPI',
    details: 'Not Found' // from response.statusText
  }
}
```

---

## 🎯 Use Cases

### In Server Routes (AnalogJS)

```typescript
import { defineEventHandler } from 'h3';
import {
  safeParseOrThrow,
  callWithErrorHandling
} from '@langchain-course-ws/communication';
import { NewChatSchema } from '../shared/schemas';
import { chatApiClient } from './utils/communication.utils';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate request
  const request = safeParseOrThrow(NewChatSchema, body);

  // Call API with error handling
  const response = await callWithErrorHandling(
    () => chatApiClient.newChat(request),
    'ChatAPI'
  );

  return response;
});
```

### In NestJS Controllers

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { safeParseOrThrow } from '@langchain-course-ws/communication';
import { CreateUserDto, UserSchema } from './dto';

@Controller('users')
export class UsersController {
  @Post()
  async createUser(@Body() body: unknown) {
    // Validate with Zod instead of class-validator
    const userData = safeParseOrThrow(UserSchema, body);

    // Process validated data
    return this.usersService.create(userData);
  }
}
```

---

## 🧪 Testing

The library includes comprehensive test coverage using Vitest.

**Run tests:**
```bash
npm run communication:test

# Or using Nx directly
npx nx test communication
```

**Run with coverage:**
```bash
npx nx test communication --coverage
```

**Test files:**
- `src/lib/utils.spec.ts` - Unit tests for all utility functions

---

## 🏗️ Building

Build the library for production:

```bash
npm run communication:build

# Or using Nx directly
npx nx build communication
```

The build output will be in `dist/libs/communication/`.

---

## 📋 Dependencies

### Runtime Dependencies
- **`h3`** - HTTP framework (for `createError`)
- **`zod`** - Schema validation library

These dependencies are managed at the workspace level in the root `package.json`.

---

## 🔗 Used By

This library is currently used by:
- **`ecommerce-assistant-ui`** - Shopping assistant frontend
- **`chat-ui`** - General chat assistant frontend

Both applications import the utilities to avoid code duplication in their server-side routes.

### ⚙️ AnalogJS/SSR Configuration

When using this library in AnalogJS server routes, use **relative imports** instead of the TypeScript path alias:

```typescript
// ✅ GOOD: Use relative imports in server routes
import {
  safeParseOrThrow,
  callWithErrorHandling,
} from '../../../../../libs/communication/src/index';

// ❌ AVOID: Path alias may not resolve at runtime in Nitro
import {
  safeParseOrThrow,
  callWithErrorHandling,
} from '@langchain-course-ws/communication';
```

**Why?** The Nitro/h3 server runtime doesn't resolve TypeScript path aliases the same way the build-time does. Using relative imports ensures the code works reliably in both development and production.

**Note:** The `ssr: { noExternal: [...] }` configuration in `vite.config.ts` is optional when using relative imports.

---

## 📝 Development

### Adding New Utilities

1. Add your utility function to `src/lib/utils.ts`
2. Export it from `src/index.ts`
3. Write tests in `src/lib/utils.spec.ts`
4. Update this README with documentation
5. Run tests: `npm run communication:test`
6. Build: `npm run communication:build`

### Type Safety

All utilities are fully typed with TypeScript. Use generic type parameters to maintain type safety:

```typescript
// Good: Type is inferred from schema
const data = safeParseOrThrow(MySchema, input); // data: z.infer<typeof MySchema>

// Also good: Explicit generic
const result = callWithErrorHandling<MyResponseType>(
  () => apiCall()
);
```

---

## 🤝 Contributing

When adding utilities to this library:

1. ✅ **Keep it focused** - Only add utilities that are used by 2+ projects
2. ✅ **Add tests** - Maintain 100% test coverage for critical utilities
3. ✅ **Document thoroughly** - Include usage examples in this README
4. ✅ **Type everything** - No `any` types unless absolutely necessary
5. ✅ **Follow patterns** - Match the existing code style and patterns

---

## 📚 Related Documentation

- [Chat API Documentation](../../apps/chat-api/README.md)
- [E-Commerce Assistant API](../../apps/ecommerce-assistant-api/README.md)
- [h3 Documentation](https://h3.unjs.io/)
- [Zod Documentation](https://zod.dev/)

---

Built with ❤️ for the LangChain Course Workspace
