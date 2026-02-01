# Shopping Assistant UI

![Shopping Assistant UI](../../doc-images/shopping-assistant-ui.webp)

## 🛍️ Overview

The **Shopping Assistant UI** is a production-ready conversational e-commerce interface built with Angular and AnalogJS. It demonstrates how to create intelligent, context-aware shopping experiences powered by LangChain and semantic search.

This application provides a natural language interface for product discovery, allowing users to ask questions like "I need a mystery book" or "Show me household items" and receive AI-powered recommendations with rich product details.

## ✨ Features

### Core Capabilities
- **Natural Language Product Search**: Ask for products in plain English
- **Multi-turn Conversations**: Maintains context across the entire shopping session
- **Smart Product Cards**: Displays product recommendations with metadata (category, ID)
- **Rich Content Rendering**: Supports Markdown formatting in AI responses
- **Session Persistence**: Maintains conversation ID across page reloads
- **Error Recovery**: Graceful error handling with retry capabilities

### User Experience
- **Real-time Feedback**: Loading states during AI processing
- **Optimistic Updates**: Immediate message display with rollback on errors
- **Auto-scroll**: Automatically scrolls to newest messages
- **Character Counter**: 5,000 character limit with visual feedback
- **Conversation Reset**: Start fresh conversations with confirmation
- **Empty State**: Helpful prompts when no messages exist

## 🏗️ Architecture

### Component Structure

```
ShoppingAssistantPage (Route)
    └── ChatContainerComponent (Smart Container)
        ├── lib-chat-bubble (Library - Message Display)
        │   └── lib-markdown-renderer (Markdown Support)
        ├── ProductCardComponent (Product Display)
        ├── ErrorAlertComponent (Error Handling)
        └── LoadingSpinnerComponent (Loading State)
```

### State Management

Built with **NgRx Signal Store** using modern patterns:

```typescript
// Store Structure
{
  messages: Message[];              // Conversation history
  conversationId: string | null;    // UUID for current session
  isSending: boolean;                // Loading state
  error: string | null;              // Error message
}

// Key Features
✅ Optimistic updates with rollback
✅ tapResponse for structured error handling
✅ rxMethod for reactive async operations
✅ Computed signals for derived state
✅ Immer.js for immutable state updates
```

### Data Flow

```
User Input
    ↓
ChatStore.sendMessage()
    ↓
Optimistic: Add user message to UI
    ↓
HTTP POST to /api/ecommerce-assistant
    ↓
Success: Add assistant response + products
Error: Rollback + show error
    ↓
UI Update via Signals
    ↓
Auto-scroll to bottom
```

## 🛠️ Tech Stack

- **Framework**: [Angular](https://angular.io/) 19+ / [AnalogJS](https://analogjs.org/)
- **State Management**: [NgRx Signal Store](https://ngrx.io/guide/signal-store) with immer.js
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **Content Rendering**: Markdown (via shared chat-components library)
- **HTTP Client**: Angular HttpClient with interceptors
- **Validation**: Zod schemas shared with API
- **Build Tool**: Vite (via AnalogJS)

## 🚀 Getting Started

### Prerequisites

Ensure the backend API is running:
```bash
# See apps/ecommerce-assistant-api/README.md for setup
npm run ecommerce-assistant-api:dev
```

### Running the UI

```bash
# Development mode with hot reload
npx nx serve ecommerce-assistant-ui
# or
npm run ecommerce-assistant-ui:dev

# Build for production
npx nx build ecommerce-assistant-ui
```

The application will be available at:
- **Development**: http://localhost:4200
- **Production Build**: `dist/apps/ecommerce-assistant-ui`

### Environment Configuration

The UI connects to the API via proxy (configured in `vite.config.ts`):

```typescript
// Proxy configuration
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3312',
      changeOrigin: true,
    }
  }
}
```

## 💬 Key Components

### ChatContainerComponent (Smart Container)

**Location**: `src/app/components/chat-container.component.ts`

The main orchestrator component that:
- Injects and manages the ChatStore
- Handles user input and message sending
- Manages conversation lifecycle (new, continue, delete)
- Delegates rendering to library components
- Implements auto-scroll behavior

### ProductCardComponent (Presentational)

**Location**: `src/app/components/product-card.component.ts`

Displays individual product recommendations:
- Renders product content and metadata
- Shows category badges
- Displays product IDs for reference
- Responsive design for mobile/desktop

### ChatStore (State Management)

**Location**: `src/app/services/shopping-assistant.store.ts`

NgRx Signal Store with:
- **Methods**: `sendMessage()`, `startNewConversation()`, `deleteConversation()`
- **Computed**: `hasMessages()`, `lastMessage()`, `conversationSummary()`
- **Effects**: Optimistic updates, error handling, rollback logic

## 📝 Usage Examples

### Starting a Conversation

```typescript
// User types: "I need a mystery book"
// Store automatically:
1. Generates conversation ID
2. Adds user message (optimistic)
3. Calls API
4. Receives structured response:
   {
     summary: "Here are some mystery books...",
     products: [...],
     hasProducts: true,
     hasMarkdown: true,
     conversationId: "uuid"
   }
5. Adds assistant message with products
```

### Follow-up Messages

```typescript
// User types: "Do you have any from Agatha Christie?"
// Store:
1. Uses existing conversationId
2. Maintains conversation context
3. API remembers previous product search
4. Returns contextually relevant results
```

### Error Handling

```typescript
// If API fails:
1. Store removes optimistic message
2. Sets error state
3. UI shows error alert with retry button
4. User can retry or dismiss
```

## 🧪 Testing

```bash
# Run unit tests
npx nx test ecommerce-assistant-ui

# Run with coverage
npx nx test ecommerce-assistant-ui --coverage

# Lint the code
npx nx lint ecommerce-assistant-ui
```

## 🔄 Integration with Backend

The UI integrates seamlessly with the e-commerce assistant API:

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ecommerce-assistant` | Start new conversation |
| PUT | `/api/ecommerce-assistant/:id` | Continue conversation |
| DELETE | `/api/ecommerce-assistant/:id` | Delete conversation |

### Request/Response Types

```typescript
// Request (to API)
{
  message: string;  // User's question
}

// Response (from API)
{
  summary: string;              // AI-generated summary
  products: ProductDocument[];  // Up to 3 products
  hasProducts: boolean;         // Whether products found
  hasMarkdown: boolean;         // Whether summary has markdown
  conversationId: string;       // UUID for session
}

// Product Document
{
  content: string;              // Product description
  metadata: {
    id: string;                 // Product UUID
    category: string;           // Product category
  }
}
```

## 🎨 Customization

### Styling

The UI uses DaisyUI themes. Customize in `tailwind.config.js`:

```javascript
daisyui: {
  themes: ["light", "dark", "cupcake"],
}
```

### Message Display

Customize chat appearance via library component inputs:

```typescript
<lib-chat-bubble
  [userBgColor]="'bg-primary'"
  [assistantBgColor]="'bg-secondary'"
  [fontSize]="'text-base'"
/>
```

## 🚧 Future Enhancements

- [ ] **Product Images**: Display product thumbnails in cards
- [ ] **Filters**: Allow filtering by price, rating, availability
- [ ] **Product Detail Modal**: Click product card to see full details
- [ ] **Conversation History**: View and restore past conversations
- [ ] **Voice Input**: Speech-to-text for voice shopping
- [ ] **Shopping Cart Integration**: Add products to cart directly from chat
- [ ] **Share Recommendations**: Share product lists via link
- [ ] **Dark Mode Toggle**: User preference for theme

## 📚 Related Documentation

- [E-Commerce Assistant API](../ecommerce-assistant-api/README.md) - Backend implementation
- [Chat Components Library](../../libs/chat-components/README.md) - Shared UI components
- [NgRx Signal Store Guide](https://ngrx.io/guide/signal-store) - State management patterns

## 🏆 Best Practices Demonstrated

1. **Smart/Presentational Pattern**: Clear separation of concerns
2. **Reactive State Management**: Signals-based reactivity throughout
3. **Optimistic UI Updates**: Immediate feedback with error recovery
4. **Type Safety**: End-to-end type safety with shared schemas
5. **Error Handling**: Graceful degradation and user-friendly errors
6. **Accessibility**: Semantic HTML and ARIA attributes
7. **Performance**: OnPush change detection and computed signals
8. **Code Reusability**: Leverages shared component library

---

Built with Angular, AnalogJS, and LangChain 🚀
