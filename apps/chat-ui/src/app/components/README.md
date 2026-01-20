# Chat UI Components

Modern Angular components built with standalone APIs, signals, and DaisyUI styling.

## Architecture Overview

```
HomePage (Layout)
    └── ChatContainerComponent (Smart Container)
        ├── lib-chat (Library - Message Display)
        ├── ErrorAlertComponent (Presentational - Error Display)
        └── LoadingSpinnerComponent (Presentational - Loading State)
```

## Key Architectural Decision

**We leverage the existing `@langchain-course-ws/chat-components` library for message display!**

The ChatContainerComponent is a **smart container** that:
- Manages state via ChatStore
- Handles user input and actions
- Shows errors and loading states
- **Delegates message display to the library's ChatComponent**

This follows proper separation of concerns and reuses existing, well-tested library components.

## Components

### ChatContainerComponent (Smart Container)

**File:** `chat-container.component.ts`
**Type:** Smart/Container Component
**Responsibility:** State management, input handling, orchestration

**Features:**
- ✅ Integrates with NgRx Signal Store (`ChatStore`)
- ✅ **Uses library's `lib-chat` for message display**
- ✅ Maps store messages to library format via computed signal
- ✅ Handles user input and message sending
- ✅ Auto-scrolls to latest message
- ✅ Error handling with retry capability
- ✅ Loading states during API calls
- ✅ Character count (10,000 max)
- ✅ New conversation confirmation
- ✅ Empty state when no messages

**Usage:**
```html
<app-chat-container />
```

**Internal Architecture:**
```typescript
// Computed signal maps store messages to library format
libraryMessages = computed(() => {
  return mapStoreMessagesToLibrary(this.chatStore.messages());
});

// Template uses library component
<lib-chat
  [userName]="chatStore.userName()"
  [messages]="libraryMessages()"
  [userBgColor]="'bg-primary'"
  [userTextColor]="'text-primary-content'"
  [assistantBgColor]="'bg-secondary'"
  [assistantTextColor]="'text-secondary-content'"
  [fontSize]="'text-base'" />
```

**Type Mapping:**

Store format:
```typescript
{
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

Library format:
```typescript
{
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

The mapper (`chat-message.mapper.ts`) converts between these formats automatically.

---

### ErrorAlertComponent (Presentational)

**File:** `error-alert.component.ts`
**Type:** Presentational/Dumb Component
**Responsibility:** Display error messages

**Features:**
- ✅ DaisyUI alert styling (alert-error)
- ✅ Dismissible with X button
- ✅ Error icon included
- ✅ Signal-based inputs
- ✅ Output event for dismiss action

**Inputs:**
- `error` (signal) - Error message to display (null hides alert)
- `dismissible` (signal) - Whether to show dismiss button (default: true)

**Outputs:**
- `dismiss` - Emitted when user dismisses the alert

**Usage:**
```html
<app-error-alert
  [error]="errorMessage()"
  [dismissible]="true"
  (dismiss)="handleDismiss()" />
```

---

### LoadingSpinnerComponent (Presentational)

**File:** `loading-spinner.component.ts`
**Type:** Presentational/Dumb Component
**Responsibility:** Display loading indicators

**Features:**
- ✅ DaisyUI loading spinner
- ✅ Multiple sizes (xs, sm, md, lg)
- ✅ Optional loading text
- ✅ Signal-based inputs
- ✅ Centered layout

**Inputs:**
- `size` (signal) - Spinner size: 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
- `text` (signal) - Optional text to display next to spinner

**Usage:**
```html
<!-- Simple spinner -->
<app-loading-spinner />

<!-- Large spinner with text -->
<app-loading-spinner
  [size]="'lg'"
  [text]="'Sending message...'" />
```

---

## Type Mapper

### chat-message.mapper.ts

**Purpose:** Adapts between ChatStore message format and library ChatComponent message format.

**Key Difference:**
- Store uses `id` field and `role` property
- Library uses `type` property without id

**Functions:**

```typescript
// Convert array of store messages to library messages
mapStoreMessagesToLibrary(storeMessages: StoreMessage[]): LibraryMessage[]

// Convert single store message to library message
mapStoreMessageToLibrary(storeMessage: StoreMessage): LibraryMessage
```

**Usage:**
```typescript
// In ChatContainerComponent
libraryMessages = computed(() => {
  return mapStoreMessagesToLibrary(this.chatStore.messages());
});
```

---

## Component Patterns

### Modern Angular Features Used

1. **Standalone Components** - No NgModule required
2. **Signal Inputs** - Modern reactive inputs
3. **Signal Outputs** - Type-safe event emitters
4. **Computed Signals** - Derived reactive state (for message mapping)
5. **Control Flow Syntax** - New template syntax
6. **Effects** - Auto-scroll on message changes

### Smart vs Presentational Pattern

**Smart Components (Container):**
- Know about state management (inject stores/services)
- Handle business logic
- Orchestrate other components
- Example: `ChatContainerComponent`

**Presentational Components (Dumb):**
- Receive data via inputs
- Emit events via outputs
- No knowledge of state management
- Reusable across the app
- Examples: `ErrorAlertComponent`, `LoadingSpinnerComponent`, `lib-chat`

### Library Integration Pattern

**Why use the library component?**

1. **Reusability** - Library component is already built and tested
2. **Consistency** - Same message display across the application
3. **Separation** - Container focuses on state, library focuses on presentation
4. **Maintainability** - Changes to message display happen in one place
5. **Best Practice** - Don't duplicate what already exists

**How it works:**

```
User types message
    ↓
ChatContainerComponent.sendMessage()
    ↓
ChatStore.sendMessage() (rxMethod)
    ↓
Store adds user message (optimistic)
    ↓
Computed signal maps messages
    ↓
lib-chat receives mapped messages
    ↓
ChatBubbleComponent renders each message
```

---

## File Structure

```
apps/chat-ui/src/app/
├── components/
│   ├── chat-container.component.ts    # Smart container
│   ├── error-alert.component.ts       # Error display
│   ├── loading-spinner.component.ts   # Loading state
│   ├── index.ts                       # Barrel exports
│   └── README.md                      # This file
└── services/
    ├── chat.store.ts                  # NgRx Signal Store
    ├── chat-api.service.ts            # HTTP service
    ├── chat-message.mapper.ts         # Type adapter
    └── index.ts                       # Barrel exports

libs/chat-components/src/lib/
├── chat/
│   └── chat.component.ts              # Used by container
├── chat-bubble/
│   └── chat-bubble.component.ts       # Used by lib-chat
└── types/
    └── chat-message.ts                # Library types
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              ChatContainerComponent                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ChatStore (State)                                 │  │
│  │   messages: StoreMessage[]                        │  │
│  │   isSending: boolean                              │  │
│  │   error: string | null                            │  │
│  └─────────────────┬─────────────────────────────────┘  │
│                    │                                     │
│                    ↓                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ computed: libraryMessages()                       │  │
│  │   mapStoreMessagesToLibrary()                     │  │
│  │   StoreMessage[] → LibraryMessage[]               │  │
│  └─────────────────┬─────────────────────────────────┘  │
│                    │                                     │
│                    ↓                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ <lib-chat>                                        │  │
│  │   [messages]="libraryMessages()"                  │  │
│  │   → ChatBubbleComponent (for each message)        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ <app-error-alert>                                 │  │
│  │   [error]="chatStore.error()"                     │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Testing the Mapper

```typescript
describe('chat-message.mapper', () => {
  it('should map store messages to library messages', () => {
    const storeMessages: StoreMessage[] = [
      {
        id: '123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      },
    ];

    const result = mapStoreMessagesToLibrary(storeMessages);

    expect(result[0]).toEqual({
      type: 'user',
      content: 'Hello',
      timestamp: storeMessages[0].timestamp,
    });
    expect(result[0]).not.toHaveProperty('id');
  });
});
```

### Integration Testing Smart Components

```typescript
describe('ChatContainerComponent', () => {
  it('should map and pass messages to library component', () => {
    const fixture = TestBed.createComponent(ChatContainerComponent);
    const component = fixture.componentInstance;

    // Add message to store
    component.chatStore.addUserMessage('Test message');
    fixture.detectChanges();

    // Check computed signal mapping
    const libraryMessages = component.libraryMessages();
    expect(libraryMessages[0].type).toBe('user');
    expect(libraryMessages[0].content).toBe('Test message');
    expect(libraryMessages[0]).not.toHaveProperty('id');
    expect(libraryMessages[0]).not.toHaveProperty('role');
  });
});
```

---

## Benefits of This Architecture

1. **Code Reuse**
   - Library component handles all message display logic
   - No duplication between apps
   - Single source of truth for message UI

2. **Clear Separation**
   - Container: State and actions
   - Library: Presentation
   - Easy to understand responsibilities

3. **Type Safety**
   - Mapper ensures type compatibility
   - Compile-time errors if types mismatch
   - Automatic updates via computed signals

4. **Maintainability**
   - Update message display in one place (library)
   - Container focuses on business logic
   - Clear data flow through mapper

5. **Testability**
   - Test mapper independently
   - Test container with mocked store
   - Test library component separately

6. **Performance**
   - Computed signals only recalculate when needed
   - Library component uses OnPush change detection
   - Efficient reactivity throughout

---

## Related Files

- **Store:** `apps/chat-ui/src/app/services/chat.store.ts`
- **API Service:** `apps/chat-ui/src/app/services/chat-api.service.ts`
- **Mapper:** `apps/chat-ui/src/app/services/chat-message.mapper.ts`
- **Schemas:** `apps/chat-ui/src/shared/chat.schema.ts`
- **Page:** `apps/chat-ui/src/app/pages/(home).page.ts`
- **Library Chat:** `libs/chat-components/src/lib/chat/chat.component.ts`
- **Library Bubble:** `libs/chat-components/src/lib/chat-bubble/chat-bubble.component.ts`
