# Shared Chat Schemas

This directory contains shared Zod schemas and TypeScript types used by both the AnalogJS server-side API routes and the Angular client components.

## Purpose

By maintaining schemas in a shared location, we:

1. **Decouple from generated OpenAPI types** - We're not bound to the chat-api client types
2. **Ensure type safety** - Both client and server use the same validated types
3. **Enable validation** - Zod schemas provide runtime validation
4. **Single source of truth** - Types and validation rules are defined once

## Usage

### In Server Routes (h3/Nitro)

```typescript
// apps/chat-ui/src/server/routes/api/v1/chat.post.ts
import { defineEventHandler, readBody } from 'h3';
import { ChatRequestSchema, ChatResponseSchema } from '../../../../shared';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate request
  const result = ChatRequestSchema.safeParse(body);
  if (!result.success) {
    throw createError({ statusCode: 400, data: result.error });
  }

  // result.data is now type-safe
  const { message, user, conversationId } = result.data;

  // ... proxy to backend ...
});
```

### In Angular Components

```typescript
// apps/chat-ui/src/app/components/chat/chat.component.ts
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { ChatRequest, ChatResponse } from '../../../shared';
import { v4 as uuidv4 } from 'uuid';

export class ChatComponent {
  private http = inject(HttpClient);

  sendMessage(message: string, userName: string) {
    const request: ChatRequest = {
      message,
      user: userName,
      conversationId: this.conversationId || uuidv4()
    };

    return this.http.post<ChatResponse>('/api/v1/chat', request);
  }
}
```

### In Services

```typescript
// apps/chat-ui/src/app/services/chat.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ChatRequest, ChatResponse } from '../../shared';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);

  chat(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/v1/chat', request);
  }
}
```

## Available Schemas

### ChatRequestSchema

Validates chat requests sent to the API.

**Fields:**
- `message` (string): User's message (1-10000 characters)
- `user` (string): User's name (1-100 characters)
- `conversationId` (string): UUID for conversation threading

**Type:** `ChatRequest`

### ChatResponseSchema

Validates responses from the chat API.

**Fields:**
- `message` (string): Assistant's response
- `conversationId` (string): UUID of the conversation

**Type:** `ChatResponse`

### ErrorResponseSchema

Validates error responses.

**Fields:**
- `statusCode` (number): HTTP status code
- `message` (string): Error message
- `error` (string, optional): Error details

**Type:** `ErrorResponse`

## Benefits of This Approach

1. **Independence**: Not tied to the OpenAPI generated client
2. **Flexibility**: Easy to add custom validation rules
3. **Type Safety**: Compile-time and runtime type checking
4. **Maintainability**: Single location to update types and validation
5. **Reusability**: Shared across server and client code
6. **Validation**: Built-in Zod validation with helpful error messages
