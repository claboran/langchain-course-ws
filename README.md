# LangChain Course Workspace

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

**A comprehensive full-stack AI application suite showcasing production-ready LangChain and LangGraph implementations.**

This monorepo demonstrates advanced AI agent patterns, semantic search, multi-turn conversations, and rich UI experiences—all built with modern TypeScript, Angular, and NestJS.

---

## 🎯 What We Built

### 1. **Intelligent Shopping Assistant** ✨

![Shopping Assistant UI](doc-images/shopping-assistant-ui.webp)

A complete e-commerce conversational AI that helps users discover products through natural language:
- **Semantic Product Search**: Vector-powered search with pgvector and embeddings
- **Multi-turn Context**: Remembers conversation history across interactions
- **Custom LangChain Tools**: Product search with category filtering + category browsing
- **Rich UI**: Interactive chat with markdown support and product cards
- **27,752 Products**: Full product catalog with vector embeddings ready for semantic search

### 2. **General-Purpose Chat Assistant**

![Mermaid Diagram Example](doc-images/mermaid-rendering-assistant-message.webp)

A versatile conversational AI demonstrating LangChain fundamentals:
- **Personalization Tools**: Custom LangChain tool for user context
- **Conversation Threading**: UUID-based conversation management
- **Rich Content**: Markdown, syntax highlighting, and Mermaid diagrams
- **Production Patterns**: NgRx Signal Store, immer.js, tapResponse

### 3. **Product Embedding Pipeline**

An ETL pipeline for generating and storing vector embeddings:
- **Batch Processing**: Efficiently handles 27K+ products
- **Ollama Integration**: Local embeddings with nomic-embed-text (768 dimensions)
- **pgvector Storage**: PostgreSQL with HNSW indexing for fast similarity search
- **Migration Support**: TypeORM migrations for schema management

---

## 🧠 AI & LangChain Concepts Covered

### Core LangChain Patterns
- ✅ **Agent Creation**: Using `createAgent` with model + tools + memory
- ✅ **Custom Tools**: Building domain-specific tools with the `tool()` function
- ✅ **Structured Output**: Using `toolStrategy` with Zod schemas for consistent responses
- ✅ **Memory Persistence**: LangGraph's `MemorySaver` checkpointer for conversation state
- ✅ **Conversation Threading**: Managing multiple concurrent conversations with thread IDs

### Vector Search & RAG
- ✅ **Embeddings**: Generating vector representations with Ollama (nomic-embed-text)
- ✅ **Vector Stores**: PGVectorStore integration with PostgreSQL
- ✅ **Semantic Search**: Similarity search with cosine distance
- ✅ **Retrieval**: Using `.asRetriever()` pattern with filtering
- ✅ **HNSW Indexing**: Fast approximate nearest neighbor search

### Production Best Practices
- ✅ **Error Handling**: tapResponse pattern for structured error flows
- ✅ **Optimistic Updates**: Immediate UI feedback with rollback on failure
- ✅ **Type Safety**: End-to-end type safety with Zod schemas
- ✅ **Model Configuration**: Centralized model provider with dependency injection
- ✅ **API Documentation**: Comprehensive Swagger/OpenAPI specs

---

---

## 🏗️ Project Structure

The workspace is organized into several applications and libraries:

### Applications
- **`chat-api` (`apps/chat-api`)**: A NestJS backend providing the AI chat logic.
  - Implements LangGraph `MemorySaver` for conversation threading.
  - Custom LangChain tools for user personalization.
  - Swagger UI for interactive API documentation.
  - 📖 [Detailed Documentation](apps/chat-api/README.md)

- **`chat-ui` (`apps/chat-ui`)**: An AnalogJS/Angular frontend.
  - Uses NgRx Signal Store for reactive state management.
  - Shared Zod schemas for validation and type safety.
  - Proxy-based integration with the backend.
  - Includes comprehensive service documentation for the chat store.

- **`api-dev-mcp-server` (`apps/api-dev-mcp-server`)**: A sophisticated Model Context Protocol (MCP) server for AI-assisted API development.
  - Generates complete OpenAPI 3.1 specifications from high-level descriptions.
  - Provides few-shot learning prompts for REST API design patterns.
  - Validates OpenAPI specs and adds custom endpoints.
  - Demonstrates advanced MCP server architecture with resources, tools, and prompts.
  - Designed for integration with LangChain agents.
  - 📖 [Detailed Documentation](apps/api-dev-mcp-server/README.md)

- **`ecommerce-assistant-api` (`apps/ecommerce-assistant-api`)**: A conversational e-commerce assistant API.
  - Semantic product search using pgvector and LangChain.
  - Multi-turn conversations with memory persistence.
  - Custom LangChain tools for product search and category browsing.
  - Structured responses with Markdown support.
  - Swagger UI for interactive API documentation.
  - 📖 [Detailed Documentation](apps/ecommerce-assistant-api/README.md)

- **`ecommerce-assistant-ui` (`apps/ecommerce-assistant-ui`)**: An AnalogJS/Angular frontend for the shopping assistant.
  - Interactive chat interface with product recommendations.
  - Rendered with Markdown and custom product cards.
  - Built with NgRx Signal Store.
  - 📖 [Detailed Documentation](apps/ecommerce-assistant-ui/README.md)

- **`product-ingest` (`apps/product-ingest`)**: An embedding pipeline for e-commerce product data.
  - Processes product catalogs and generates vector embeddings for semantic search.
  - First step in building an intelligent e-commerce agent.
  - Integrates with vector databases for efficient product knowledge retrieval.
  - 📖 [Detailed Documentation](apps/product-ingest/README.md)

- **`hello-agent` (`apps/hello-agent`)**: A CLI tool built with Nest Commander for quick AI interactions.

### Infrastructure
- **`iac` (`iac/`)**: Infrastructure as Code for deployment and vector database setup.
  - 📖 [Infrastructure Documentation](iac/README.md)

### Libraries
- **`chat-components` (`libs/chat-components`)**: Reusable Angular UI components (message bubbles, markdown rendering).
  - 📖 [Detailed Documentation](libs/chat-components/README.md)
  - Features markdown rendering with syntax highlighting.
  - Supports Mermaid diagram visualization.
  - Optimized for performance and accessibility.

- **`model-provider` (`libs/model-provider`)**: A shared library for MistralAI configuration and integration.
  - 📖 [Detailed Documentation](libs/model-provider/README.md)
  - Provides centralized Mistral AI model management.
  - Supports both synchronous and asynchronous configuration.
  - Enables dependency injection across the workspace.

- **`communication` (`libs/communication`)**: Shared utilities for API communication, validation, and error handling.
  - 📖 [Detailed Documentation](libs/communication/README.md)
  - Zod schema validation with structured error responses.
  - Standardized API error handling wrappers.
  - Type-safe conversation ID validation.
  - Used by chat-ui and ecommerce-assistant-ui server routes.

---

## 🛠️ Tech Stack

### AI & LangChain
- **LLM**: [Mistral AI](https://docs.mistral.ai/) (`mistral-large-latest`)
- **Orchestration**: [LangChain JS](https://js.langchain.com/) - Agent framework with custom tools
- **Memory**: [LangGraph](https://langchain-ai.github.io/langgraphjs/) - MemorySaver checkpointer for conversation state
- **Embeddings**: [Ollama](https://ollama.ai/) - nomic-embed-text (768 dimensions)
- **Vector Database**: PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) extension

### Backend
- **Framework**: [NestJS](https://nestjs.com/) - Enterprise Node.js framework
- **Build Tool**: [Vite](https://vitejs.dev/) - Fast development and production builds
- **Validation**: Zod schemas + class-validator
- **API Docs**: Swagger/OpenAPI with interactive UI
- **ORM**: TypeORM for database migrations

### Frontend
- **Framework**: [Angular](https://angular.io/) + [AnalogJS](https://analogjs.org/) - Meta-framework for Angular
- **State**: [NgRx Signal Store](https://ngrx.io/guide/signal-store) - Reactive state management with signals
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **Content**: Marked.js (markdown), Prism.js (syntax highlighting), Mermaid.js (diagrams)

### Workspace & Tooling
- **Monorepo**: [Nx](https://nx.dev) - Smart, fast build system
- **Package Manager**: npm
- **TypeScript**: Full type safety across the stack
- **Infrastructure**: Docker Compose for local development

## 🏛️ Architecture Overview

```mermaid
graph TD;
    A[User] --> B[Chat UI];
    B --> C[Chat API];
    C --> D[LangChain Agent];
    D --> E[Mistral AI];
    D --> F[MemorySaver];
    E --> G[Response];
    F --> G;
    G --> B;
    
    subgraph Frontend
    B[Chat UI] --> H[NgRx Signal Store];
    B --> I[Chat Components];
    I --> J[Markdown Renderer];
    I --> K[Mermaid Support];
    end
    
    subgraph Backend
    C[Chat API] --> L[Model Provider];
    C --> M[Custom Tools];
    C --> N[Swagger Docs];
    end
    
    subgraph Shared
    O[Zod Schemas] --> B;
    O --> C;
    P[Model Provider] --> C;
    Q[Communication Utils] --> B;
    Q --> C;
    end
```

### Data Flow
1. **User Interaction**: User sends a message through the chat interface
2. **State Management**: NgRx Signal Store manages conversation state
3. **API Request**: Chat UI sends request to NestJS backend
4. **AI Processing**: LangChain agent processes request with context from MemorySaver
5. **Model Integration**: Mistral AI generates response using the configured model
6. **Response Handling**: Backend returns structured response with conversation context
7. **Content Rendering**: Chat UI displays response with markdown, code highlighting, and diagrams

---

## 📚 Buildable Libraries & Shared Code

This workspace uses **buildable libraries** with npm workspaces for code sharing between applications. This enables:
- ✅ Type-safe imports across apps
- ✅ Shared validation logic (Zod schemas)
- ✅ Reusable utility functions
- ✅ Nx build caching and optimization

### Shared Libraries

- **`@langchain-course-ws/communication`**: Validation utilities (`safeParseOrThrow`, `callWithErrorHandling`)
- **`@langchain-course-ws/model-provider`**: LangChain model configuration (Mistral AI, Ollama embeddings)
- **`@langchain-course-ws/chat-components`**: Reusable Angular chat UI components

### Key Configuration

**NPM Workspaces** (`package.json`):
```json
{
  "workspaces": ["dist/libs/*"]
}
```

This creates Node.js-resolvable symlinks:
```
node_modules/@langchain-course-ws/communication → dist/libs/communication
```

**Auto-Build Dependencies** (`nx.json`):
```json
{
  "targetDefaults": {
    "@analogjs/platform:vite-dev-server": {
      "dependsOn": ["^build"]
    }
  }
}
```

Libraries are automatically built before serving applications.

### Development Workflow

```bash
# Libraries auto-build, no manual steps needed
nx serve chat-ui

# If you add a new library, recreate symlinks
npm install --legacy-peer-deps
```

**📖 Full Documentation**: See [docs/BUILDABLE_LIBRARIES.md](./docs/BUILDABLE_LIBRARIES.md) for complete details on:
- How buildable libraries work with AnalogJS SSR
- Adding new libraries
- Troubleshooting module resolution
- Import guidelines

---

## 🚦 Getting Started

### Prerequisites

**Required:**
- Node.js v18 or higher
- npm (comes with Node.js)
- Mistral AI API Key ([Get one here](https://console.mistral.ai/))

**For E-Commerce Assistant:**
- Docker (for PostgreSQL + pgvector)
- Ollama ([Download](https://ollama.ai/)) with `nomic-embed-text` model

### Quick Start (Chat Assistant)

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd langchain-course-ws
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Create .env file in the root
   cat > .env << EOF
   MISTRAL_API_KEY=your_mistral_api_key_here
   EOF
   ```

3. **Start the applications:**
   ```bash
   # Option 1: Run both API and UI together
   npm run dev

   # Option 2: Run individually
   npm run chat-api:dev      # API on http://localhost:3311
   npm run chat-ui:dev       # UI on http://localhost:4200
   ```

4. **Access the applications:**
   - **Chat UI**: http://localhost:4200
   - **Chat API Docs**: http://localhost:3311/api/docs

### Full Setup (E-Commerce Assistant)

<details>
<summary><strong>Click to expand full setup instructions</strong></summary>

#### 1. Install Ollama and Pull Model

```bash
# Install Ollama (see https://ollama.ai/)
# Then pull the embedding model:
ollama pull nomic-embed-text
```

#### 2. Start Infrastructure

```bash
# Start PostgreSQL with pgvector
docker-compose -f iac/docker-compose.postgres.yml up -d

# WSL2 only: Start Ollama proxy
docker-compose -f iac/docker-compose.nginx.yml up -d
```

#### 3. Configure Environment

```bash
# Update .env with additional settings
cat >> .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langchain
OLLAMA_BASE_URL=http://localhost:11435
PORT=3312
EOF
```

#### 4. Run Database Migration

```bash
npm run product-ingest:migrate
```

#### 5. Ingest Product Data

```bash
# Build and run the ingestion pipeline
npm run product-ingest:build
node dist/apps/product-ingest/main.js ingest
```

This will process 27,752 products and generate embeddings. Time varies based on your hardware (5-30+ minutes depending on CPU/GPU).

#### 6. Start E-Commerce Assistant

```bash
# Terminal 1: Start API
npm run ecommerce-assistant-api:dev

# Terminal 2: Start UI
npm run ecommerce-assistant-ui:dev
```

#### 7. Access E-Commerce Assistant

- **Shopping UI**: http://localhost:4200 (AnalogJS dev server)
- **API Documentation**: http://localhost:3312/api/docs
- **Database**: `psql postgresql://postgres:postgres@localhost:5432/langchain`

**See detailed documentation:**
- [E-Commerce API Setup](apps/ecommerce-assistant-api/README.md)
- [Product Ingestion](apps/product-ingest/README.md)
- [Infrastructure](iac/README.md)

</details>

---

---

## 🧪 Testing

The workspace uses Vitest for unit testing and Playwright for E2E testing.

```sh
# Run all tests
npx nx run-many -t test

# Run specific project tests
npm run chat-api:test
npm run chat-ui:test
npm run chat-components:test
npm run communication:test
```

---

## 🔧 Useful Nx Commands

- **Visual Graph**: `npx nx graph` - See how projects depend on each other.
- **Generate Code**: `npx nx g @nx/angular:component my-component --project=chat-ui`
- **Linting**: `npx nx run-many -t lint`

---

## 📖 Documentation

### 📂 Internal Documentation (This Repository)

**Applications:**
- [Chat API](apps/chat-api/README.md) - Multi-turn conversation API with LangChain agent
- [Chat UI Components](apps/chat-ui/src/app/components/README.md) - Angular components architecture
- [E-Commerce Assistant API](apps/ecommerce-assistant-api/README.md) - Semantic product search API
- [E-Commerce Assistant UI](apps/ecommerce-assistant-ui/README.md) - Shopping assistant interface
- [Product Ingest Pipeline](apps/product-ingest/README.md) - Vector embedding generation

**Libraries:**
- [Chat Components](libs/chat-components/README.md) - Reusable Angular chat UI components
- [Model Provider](libs/model-provider/README.md) - Centralized Mistral AI configuration
- [Communication](libs/communication/README.md) - Shared API utilities, validation, and error handling

**Infrastructure & Services:**
- [Infrastructure Setup](iac/README.md) - Docker configurations for PostgreSQL and Ollama
- [Chat Store](apps/chat-ui/src/app/services/README.md) - NgRx Signal Store patterns
- [Shared Schemas](apps/chat-ui/src/shared/README.md) - Zod validation schemas

### 🌐 External Resources

**LangChain & AI:**
- [LangChain JS Documentation](https://js.langchain.com/) - JavaScript/TypeScript library docs
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/) - State management for agents
- [Mistral AI API](https://docs.mistral.ai/) - LLM provider documentation
- [Ollama Documentation](https://ollama.ai/) - Local model hosting
- [pgvector GitHub](https://github.com/pgvector/pgvector) - Vector similarity search

**Frontend Technologies:**
- [Angular](https://angular.io/) - Modern web framework
- [AnalogJS](https://analogjs.org/) - Meta-framework for Angular with SSR
- [NgRx Signal Store](https://ngrx.io/guide/signal-store) - Reactive state management
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [DaisyUI](https://daisyui.com/) - Tailwind component library

**Backend & Tooling:**
- [NestJS](https://docs.nestjs.com/) - Enterprise Node.js framework
- [Nx](https://nx.dev) - Smart monorepo tools
- [Zod](https://zod.dev/) - TypeScript-first schema validation

---

## 🔮 Future Improvements

### Short-term Enhancements
- [ ] **Streaming Responses**: Implement Server-Sent Events (SSE) for real-time message streaming
- [ ] **Persistent Memory**: Replace in-memory checkpointer with PostgreSQL/Redis storage
- [ ] **Dynamic Categories**: Auto-detect product categories from database instead of hardcoding
- [ ] **User Authentication**: Add login/signup with session management
- [ ] **Conversation Management**: Add UI for viewing, searching, and deleting past conversations

### Advanced Features
- [ ] **Hybrid Search**: Combine semantic search with keyword search and filters (price, rating)
- [ ] **Product Comparison**: Tool for side-by-side product comparison
- [ ] **Shopping Cart**: Full cart management with checkout flow
- [ ] **Personalized Recommendations**: User preference learning and recommendation engine
- [ ] **Multi-modal Support**: Image understanding for product visuals
- [ ] **Voice Interface**: Speech-to-text and text-to-speech integration

### Technical Improvements
- [ ] **Rate Limiting**: Implement API rate limiting per user/session
- [ ] **Conversation Summarization**: Automatic summarization for long conversations
- [ ] **Observability**: Add logging, metrics, and tracing (OpenTelemetry)
- [ ] **Increased Test Coverage**: More comprehensive unit and integration tests
- [ ] **CI/CD**: Automated deployment pipeline
- [ ] **Production Deployment**: Containerization and cloud deployment (AWS/Azure/GCP)

---

## 📊 Project Structure

```
langchain-course-ws/
├── apps/
│   ├── chat-api/                    # NestJS API with LangChain agent
│   ├── chat-ui/                     # AnalogJS/Angular frontend
│   ├── ecommerce-assistant-api/     # E-commerce semantic search API
│   ├── ecommerce-assistant-ui/      # Shopping assistant UI
│   ├── product-ingest/              # Vector embedding pipeline
│   └── hello-agent/                 # CLI demo tool
├── libs/
│   ├── chat-components/             # Reusable Angular UI components
│   ├── communication/               # Shared API utilities and validation
│   └── model-provider/              # Mistral AI configuration library
├── iac/
│   ├── docker-compose.postgres.yml  # PostgreSQL + pgvector
│   └── docker-compose.nginx.yml     # Ollama proxy (WSL2)
├── data/                            # Product datasets
└── doc-images/                      # Documentation images
```

---

## 🙏 Acknowledgments

Built as part of the LangChain learning journey. Special thanks to the open-source communities behind:
- LangChain & LangGraph
- Angular & AnalogJS
- Nx & NestJS
- Mistral AI & Ollama

---

Made with ❤️ and AI
