# Chat Store

NgRx Signal Store implementation for managing chat conversations with the LangChain-powered chat API.

## Overview

The `ChatStore` provides a reactive, type-safe state management solution for chat functionality using NgRx Signal Store with best practices including:

- ✅ **Immer.js integration** for immutable state updates
- ✅ **tapResponse pattern** for structured error handling
- ✅ **rxMethod pattern** for reactive async operations
- ✅ **Optimistic updates** with rollback on error
- ✅ **Layered withMethods** for composable functionality
- ✅ **Computed signals** for derived state

## State Structure

```typescript
type ChatState = {
  messages: ChatMessage[];        // Conversation history
  conversationId: string | null;  // Current conversation UUID
  userName: string;                // User's display name
  isSending: boolean;              // Loading state for sending
  error: string | null;            // Error message if any
}

type ChatMessage = {
  id: string;                      // Message UUID
  role: 'user' | 'assistant';      // Message sender
  content: string;                 // Message text
  timestamp: Date;                 // When message was created
}
```

## Basic Usage

### In a Component

```typescript
import { Component, inject } from '@angular/core';
import { ChatStore } from './services';

@Component({
  selector: 'app-chat',
  standalone: true,
  template: `
    <div class="chat-container">
      <!-- Messages -->
      <div class="messages">
        @for (message of chatStore.messages(); track message.id) {
          <div [class]="'message message-' + message.role">
            <strong>{{ message.role }}:</strong>
            <p>{{ message.content }}</p>
            <small>{{ message.timestamp | date:'short' }}</small>
          </div>
        }
      </div>

      <!-- Error -->
      @if (chatStore.error()) {
        <div class="error">
          {{ chatStore.error() }}
          <button (click)="chatStore.clearError()">Dismiss</button>
        </div>
      }

      <!-- Input -->
      <div class="input-area">
        <input
          #messageInput
          type="text"
          [disabled]="chatStore.isSending()"
          (keydown.enter)="sendMessage(messageInput.value, messageInput)"
          placeholder="Type a message..." />
        <button
          (click)="sendMessage(messageInput.value, messageInput)"
          [disabled]="chatStore.isSending()">
          @if (chatStore.isSending()) {
            Sending...
          } @else {
            Send
          }
        </button>
      </div>
    </div>
  `,
})
export class ChatComponent {
  readonly chatStore = inject(ChatStore);

  ngOnInit() {
    // Set user name (could come from auth service)
    this.chatStore.setUserName('John Doe');

    // Start a new conversation
    this.chatStore.startNewConversation();
  }

  sendMessage(message: string, input: HTMLInputElement) {
    if (message.trim()) {
      this.chatStore.sendMessage(message.trim());
      input.value = ''; // Clear input
    }
  }
}
```

## Available Methods

### Synchronous Methods

#### `setUserName(userName: string)`
Set the user's display name.

```typescript
chatStore.setUserName('Jane Smith');
```

#### `clearError()`
Clear the current error state.

```typescript
chatStore.clearError();
```

#### `startNewConversation()`
Start a fresh conversation. Clears messages and generates a new conversation ID.

```typescript
chatStore.startNewConversation();
```

#### `reset()`
Reset the entire store to initial state.

```typescript
chatStore.reset();
```

#### `addUserMessage(content: string): string`
Manually add a user message (used internally, rarely needed directly).

```typescript
const messageId = chatStore.addUserMessage('Hello!');
```

#### `addAssistantMessage(content: string)`
Manually add an assistant message (used internally, rarely needed directly).

```typescript
chatStore.addAssistantMessage('Hi there!');
```

#### `removeMessage(messageId: string)`
Remove a message by ID (used internally for rollback).

```typescript
chatStore.removeMessage('some-uuid');
```

### Async Methods (rxMethod)

#### `sendMessage(message: string)`
Send a message to the chat API with optimistic updates.

**Behavior:**
1. Ensures a conversation ID exists
2. Clears any previous errors
3. Optimistically adds user message to UI
4. Sends request to API
5. On success: adds assistant response
6. On error: removes optimistic message and shows error

```typescript
// Simple usage
chatStore.sendMessage('What is the weather today?');

// With input binding
<button (click)="chatStore.sendMessage(userInput())">Send</button>
```

#### `sendAndClear(message: string, clearCallback?: () => void)`
Send a message and execute a callback (useful for clearing inputs).

```typescript
sendMessage(input: HTMLInputElement) {
  this.chatStore.sendAndClear(input.value, () => {
    input.value = '';
  });
}
```

#### `retryLastMessage()`
Retry sending the last user message (useful for error recovery).

```typescript
<button (click)="chatStore.retryLastMessage()">Retry</button>
```

## Computed Signals

### `hasMessages`
Check if there are any messages in the conversation.

```typescript
@if (chatStore.hasMessages()) {
  <div>You have {{ chatStore.messages().length }} messages</div>
}
```

### `lastMessage`
Get the most recent message.

```typescript
const last = chatStore.lastMessage();
if (last) {
  console.log(`Last message from ${last.role}: ${last.content}`);
}
```

### `hasActiveConversation`
Check if there's an active conversation.

```typescript
@if (!chatStore.hasActiveConversation()) {
  <button (click)="chatStore.startNewConversation()">
    Start Chat
  </button>
}
```

### `conversationSummary`
Get a summary of the conversation state.

```typescript
const summary = chatStore.conversationSummary();
console.log({
  messageCount: summary.messageCount,
  conversationId: summary.conversationId,
  userName: summary.userName,
  hasError: summary.hasError,
});
```

## Advanced Usage

### With Effect for Auto-scroll

```typescript
import { effect } from '@angular/core';

export class ChatComponent {
  readonly chatStore = inject(ChatStore);

  constructor() {
    // Auto-scroll when new messages arrive
    effect(() => {
      const messages = this.chatStore.messages();
      if (messages.length > 0) {
        this.scrollToBottom();
      }
    });
  }

  scrollToBottom() {
    // Scroll logic
  }
}
```

### With Local Storage Persistence

```typescript
export class ChatComponent {
  readonly chatStore = inject(ChatStore);

  constructor() {
    // Load from localStorage on init
    const saved = localStorage.getItem('chatState');
    if (saved) {
      const state = JSON.parse(saved);
      // Note: You'd need to add a method to restore state
      // For now, manually set
      if (state.conversationId) {
        this.chatStore.startNewConversation();
      }
    }

    // Save to localStorage on changes
    effect(() => {
      const state = {
        messages: this.chatStore.messages(),
        conversationId: this.chatStore.conversationId(),
      };
      localStorage.setItem('chatState', JSON.stringify(state));
    });
  }
}
```

### With Streaming Responses (Future Enhancement)

The current implementation expects complete responses, but you could extend it for streaming:

```typescript
// Future: Add a method for streaming
streamMessage: rxMethod<string>(
  pipe(
    tap(() => {
      // Add empty assistant message
      const assistantId = this.addAssistantMessage('');
      // Store ID for updates
    }),
    switchMap((message) =>
      this.chatApi.streamMessage(message).pipe(
        tap((chunk) => {
          // Update assistant message with chunks
        }),
        // ...
      )
    )
  )
)
```

## Error Handling

The store handles errors automatically:

1. **Network errors**: Rolls back optimistic updates
2. **Validation errors**: Shows error message
3. **Server errors**: Shows user-friendly error

```typescript
// Errors are automatically captured
@if (chatStore.error()) {
  <div class="alert alert-error">
    <p>{{ chatStore.error() }}</p>
    <button (click)="chatStore.retryLastMessage()">Retry</button>
    <button (click)="chatStore.clearError()">Dismiss</button>
  </div>
}
```

## Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ChatStore } from './chat.store';

describe('ChatStore', () => {
  let store: InstanceType<typeof ChatStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChatStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(ChatStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send message and receive response', (done) => {
    store.setUserName('Test User');
    store.startNewConversation();

    const conversationId = store.conversationId()!;
    store.sendMessage('Hello!');

    const req = httpMock.expectOne('/api/v1/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      message: 'Hello!',
      user: 'Test User',
      conversationId,
    });

    req.flush({
      message: 'Hi there!',
      conversationId,
    });

    setTimeout(() => {
      expect(store.messages().length).toBe(2);
      expect(store.messages()[0].content).toBe('Hello!');
      expect(store.messages()[1].content).toBe('Hi there!');
      expect(store.isSending()).toBe(false);
      done();
    });
  });

  it('should handle errors and rollback', (done) => {
    store.setUserName('Test User');
    store.startNewConversation();

    store.sendMessage('Hello!');

    const req = httpMock.expectOne('/api/v1/chat');
    req.error(new ProgressEvent('error'));

    setTimeout(() => {
      expect(store.messages().length).toBe(0); // Rolled back
      expect(store.error()).toBeTruthy();
      expect(store.isSending()).toBe(false);
      done();
    });
  });
});
```

## Integration with Shared Schemas

The store uses the shared Zod schemas defined in `apps/chat-ui/src/shared`:

```typescript
import type { ChatRequest, ChatResponse } from '../../shared';
```

This ensures type safety between:
- Angular frontend (this store)
- AnalogJS API routes (server)
- Validation schemas (Zod)

## Best Practices

1. **Always set user name** before sending messages
2. **Use `startNewConversation()`** to begin new chats
3. **Check `isSending()`** before allowing new messages
4. **Handle errors** with the error signal
5. **Use `retryLastMessage()`** for error recovery
6. **Clear errors** with `clearError()` after displaying
7. **Access state with `()`** - they're signals!

## Architecture

```
┌─────────────────────────────────────────────┐
│           ChatStore (Signal Store)          │
│                                             │
│  State: messages, conversationId, etc.     │
│  Methods: sendMessage(), startNew(), etc.  │
│  Computed: hasMessages, lastMessage, etc.  │
└────────────┬────────────────────────────────┘
             │
             │ uses
             ▼
┌─────────────────────────────────────────────┐
│         ChatApiService (HTTP)               │
│                                             │
│  POST /api/v1/chat                         │
└────────────┬────────────────────────────────┘
             │
             │ validates with
             ▼
┌─────────────────────────────────────────────┐
│       Shared Zod Schemas                    │
│                                             │
│  ChatRequestSchema, ChatResponseSchema     │
└─────────────────────────────────────────────┘
```
