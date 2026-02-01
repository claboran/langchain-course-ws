# E-commerce Assistant API

Conversational e-commerce assistant API built with NestJS, LangChain, and LangGraph. This API provides semantic product search and category browsing with multi-turn conversation memory.

## Features

- **Semantic Product Search**: Uses pgvector for intelligent product matching based on natural language queries
- **Category Browsing**: Returns available product categories in the shop
- **Multi-turn Conversations**: Maintains conversation history using LangChain's `createAgent` with LangGraph's `MemorySaver` checkpointer
- **Conversation Threading**: Uses UUID-based conversation IDs to track and maintain separate conversation threads
- **Structured Responses**: Consistent JSON format with summary, products, and metadata flags
- **LangChain Tools**: Two custom tools for product search and category listing
- **Model Provider Integration**: Uses the `@langchain-course-ws/model-provider` library for ChatMistralAI and Ollama embeddings
- **Interactive API Documentation**: Comprehensive Swagger UI with multiple request examples and detailed response schemas
- **Validation & Type Safety**: Request validation using class-validator with TypeScript DTOs
- **CORS Enabled**: Ready for frontend integration
- **Markdown Support**: Responses can include Markdown formatting for better readability

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL with pgvector extension
- Ollama running locally with nomic-embed-text model
- Mistral API key

### Installation

Dependencies are managed at the workspace root level.

### Configuration

Ensure your `.env` file in the workspace root includes:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langchain
OLLAMA_BASE_URL=http://localhost:11435
PORT=3312
```

### Database Setup

The API uses an existing `product_embeddings` table created by the `product-ingest` application. Make sure to run product ingestion first:

```bash
npm run product-ingest:migrate  # Run migrations
npm run product-ingest:dev      # Ingest products
```

### Running the API

```bash
# Development mode (with hot reload)
npm run ecommerce-assistant-api:dev
# or
npx nx serve ecommerce-assistant-api

# Build for production
npm run ecommerce-assistant-api:build
# or
npx nx build ecommerce-assistant-api

# Run production build
node dist/ecommerce-assistant-api/main.js
```

The API will be available at:
- **API Base URL**: `http://localhost:3312/api`
- **Swagger Documentation**: `http://localhost:3312/api/docs`

## API Documentation

### Swagger UI

The API includes comprehensive interactive documentation powered by Swagger UI. Visit `http://localhost:3312/api/docs` to:

- View detailed endpoint documentation
- See request/response schemas
- Try out the API directly from the browser
- Explore pre-configured example requests for product search and category queries

### Endpoint: POST `/api/ecommerce-assistant`

Create a new conversation with the e-commerce assistant.

#### Request Body

```json
{
  "message": "I need a good mystery book"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The user's message (1-5000 characters) |

#### Response

```json
{
  "summary": "I found some great mystery books for you! Here are three options:\n\n1. **Mysteries of Ancient Egypt** by Lorna Oakes...",
  "products": [
    {
      "content": "Mysteries of Ancient Egypt by Lorna Oakes...",
      "metadata": {
        "id": "a2a0748c-258f-4aae-8943-0b657edc6579",
        "category": "books"
      }
    }
  ],
  "hasProducts": true,
  "hasMarkdown": true,
  "conversationId": "c0afb48c-191f-4f23-a282-6ed244e5a0c7"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | AI-generated summary describing the products (may include Markdown) |
| `products` | array | Array of up to 3 product documents with content and metadata |
| `hasProducts` | boolean | Whether products were found |
| `hasMarkdown` | boolean | Whether the summary contains Markdown formatting |
| `conversationId` | string (UUID) | Unique conversation ID for maintaining context |

### Endpoint: PUT `/api/ecommerce-assistant/:conversationId`

Continue an existing conversation with follow-up messages.

#### Request Body

```json
{
  "message": "Do you have any from Agatha Christie?"
}
```

#### Response

Same format as POST endpoint. The assistant will use conversation history to provide contextual responses.

### Endpoint: DELETE `/api/ecommerce-assistant/:conversationId`

Remove a conversation and its history from memory.

#### Response

```json
{
  "message": "Conversation removed successfully"
}
```

#### HTTP Status Codes

- **200 OK**: Successfully received a response from the assistant
- **201 Created**: Conversation created successfully
- **400 Bad Request**: Invalid input data (missing fields, invalid UUID format, etc.)
- **404 Not Found**: Conversation not found
- **500 Internal Server Error**: Failed to get response from AI

## Usage Examples

### Example 1: Starting a New Conversation (Product Search)

```bash
curl -X POST http://localhost:3312/api/ecommerce-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a mystery book"
  }'
```

### Example 2: Starting a New Conversation (Category Query)

```bash
curl -X POST http://localhost:3312/api/ecommerce-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What does your shop sell?"
  }'
```

### Example 3: Continuing the Conversation

```bash
# First, save the conversationId from the initial response
CONVERSATION_ID="c0afb48c-191f-4f23-a282-6ed244e5a0c7"

# Then send a follow-up message
curl -X PUT "http://localhost:3312/api/ecommerce-assistant/$CONVERSATION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Do you have any fiction mystery novels?"
  }'
```

### Example 4: Deleting a Conversation

```bash
curl -X DELETE "http://localhost:3312/api/ecommerce-assistant/$CONVERSATION_ID"
```

## Architecture

### Technology Stack

- **Framework**: NestJS
- **LLM**: Mistral AI (via `@langchain/mistralai`)
- **Embeddings**: Ollama with nomic-embed-text
- **Vector Store**: PGVectorStore (PostgreSQL with pgvector extension)
- **Agent Framework**: LangChain with `createAgent`
- **Memory**: LangGraph's `MemorySaver` (in-memory checkpointer)
- **Validation**: class-validator with DTOs
- **Documentation**: Swagger/OpenAPI
- **Tools**: LangChain tool system

### How It Works

#### 1. LangChain Agent with Tools

The service uses LangChain's `createAgent` to create an AI agent with access to two custom tools:

```typescript
const agent = createAgent({
  model: this.model,
  tools: [productSearchTool, categoryTool],
  checkpointer: this.checkpointer,
  responseFormat: toolStrategy(EcommerceResultSchema),
});
```

**Key Components:**

- **Agent**: Orchestrates the conversation flow, tool usage, and response generation
- **Checkpointer**: LangGraph's `MemorySaver` stores conversation history in-memory, keyed by `thread_id` (conversationId)
- **Tools**: Custom tools for semantic product search and category listing
- **Response Format**: Structured output using Zod schema validation

#### 2. Product Search Tool

Uses semantic search with pgvector to find relevant products:

```typescript
const productSearchTool = tool(
  async (input: ProductSearchInput): Promise<string> => {
    const vectorStore = await this.vectorStoreService.getVectorStore();
    const retriever = vectorStore.asRetriever({
      k: 3,
      filter: input.category ? { category: input.category } : undefined
    });
    const results = await retriever.invoke(input.query);
    return JSON.stringify(results);
  },
  {
    name: 'search_products',
    description: 'Search for products using semantic search...',
    schema: ProductSearchInputSchema,
  }
);
```

**Features:**
- Semantic search understands natural language queries
- Optional category filtering ("books", "household", "clothing & accessories")
- Returns up to 3 most relevant products
- Uses Ollama embeddings (nomic-embed-text) for vector similarity

#### 3. Category Tool

Returns the list of available product categories:

```typescript
const categoryTool = tool(
  async (): Promise<string[]> => {
    return ["books", "household", "clothing & accessories"];
  },
  {
    name: 'get_categories',
    description: 'Get the list of available product categories...',
    schema: GetCategoriesInputSchema,
  }
);
```

#### 4. Structured Output

The agent uses LangChain's `toolStrategy` to ensure responses follow a consistent schema:

```typescript
const EcommerceResultSchema = z.object({
  summary: z.string().min(1).max(5000),
  products: z.array(ProductDocumentSchema).max(3),
  hasProducts: z.boolean(),
  hasMarkdown: z.boolean(),
});
```

This guarantees that every response includes:
- A helpful summary (with optional Markdown formatting)
- The product documents found (if any)
- Flags indicating whether products were found and if Markdown is present

#### 5. Multi-turn Memory

Each conversation is stored separately using the `conversationId` as the thread ID. The agent automatically:
- Maintains message history (system messages, user messages, assistant responses, tool calls)
- Provides context to the LLM for each new message
- Enables the assistant to reference previous exchanges and products mentioned

Based on LangChain's short-term memory best practices: [Short-term Memory Documentation](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)

### Project Structure

```
ecommerce-assistant-api/
├── src/
│   ├── app/
│   │   └── app.module.ts                 # Main application module
│   ├── ecommerce-assistant/
│   │   ├── dto/
│   │   │   ├── new-conversation-request.dto.ts
│   │   │   ├── continue-conversation-request.dto.ts
│   │   │   └── conversation-response.dto.ts
│   │   ├── tools/
│   │   │   ├── product-search.service.ts  # Semantic search tool
│   │   │   └── category.service.ts        # Category listing tool
│   │   ├── ecommerce-assistant.controller.ts  # REST endpoints
│   │   ├── ecommerce-assistant.service.ts     # Business logic
│   │   ├── ecommerce-assistant.model.ts       # Zod schemas
│   │   ├── agent.service.ts                   # LangChain agent setup
│   │   ├── assistant-memory.service.ts        # Memory management
│   │   ├── vector-store.service.ts            # PGVectorStore connection
│   │   └── ecommerce-assistant.module.ts      # Feature module
│   └── main.ts                           # Application bootstrap & Swagger
├── vite.config.mts                       # Vite build configuration
└── README.md                             # This file
```

## Configuration

### Model Settings

The Mistral AI model and Ollama embeddings are configured in `app.module.ts`:

```typescript
ModelProviderModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    apiKey: configService.get<string>('MISTRAL_API_KEY') || '',
    model: 'mistral-large-latest',
    temperature: 0.7,
  }),
}),
EmbeddingProviderModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    baseUrl: configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434',
    model: 'nomic-embed-text',
  }),
})
```

**Parameters:**
- `model`: `mistral-large-latest` (supports tool calling and structured output)
- `temperature`: `0.7` (balanced between creativity and consistency)
- `embeddings`: `nomic-embed-text` via Ollama (768-dimensional embeddings)

### Vector Store Settings

The PGVectorStore is configured to use the `product_embeddings` table:

```typescript
PGVectorStore.initialize(embeddings, {
  postgresConnectionOptions: pgConfig,
  tableName: 'product_embeddings',
  columns: {
    contentColumnName: 'content',
    vectorColumnName: 'embedding',
    metadataColumnName: 'metadata',
  },
});
```

### Validation Settings

Global validation is enabled in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Reject requests with unknown properties
    transform: true,            // Auto-transform payloads to DTO instances
  })
);
```

## Development

### Building

```bash
# Build the project
npm run ecommerce-assistant-api:build
# or
npx nx build ecommerce-assistant-api

# Build with verbose output
npx nx build ecommerce-assistant-api --verbose
```

### Testing

```bash
# Run tests
npm run ecommerce-assistant-api:test
# or
npx nx test ecommerce-assistant-api
```

### Linting

```bash
# Run ESLint
npx nx lint ecommerce-assistant-api
```

## Limitations

- **Memory**: Conversation history is stored in-memory and will be lost on server restart
- **Products**: Limited to products ingested via the `product-ingest` application
- **Categories**: Hardcoded to ["books", "household", "clothing & accessories"]
- **Results**: Maximum 3 products per search query

## Future Enhancements

- [ ] Add streaming responses using Server-Sent Events (SSE)
- [ ] Implement persistent storage for conversation history (PostgreSQL/Redis)
- [ ] Add conversation summarization for long threads
- [ ] Implement dynamic category detection from database
- [ ] Add product availability and pricing information
- [ ] Add shopping cart management
- [ ] Implement more tools (product comparison, recommendations, reviews)
- [ ] Add authentication and user management
- [ ] Implement rate limiting
- [ ] Add conversation history retrieval endpoint (GET `/api/ecommerce-assistant/:conversationId/history`)
- [ ] Add filter options (price range, ratings, etc.)
- [ ] Implement hybrid search (semantic + keyword + filters)

## Related Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [LangChain JS Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangChain Short-term Memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)
- [Mistral AI API](https://docs.mistral.ai/)
- [PGVector](https://github.com/pgvector/pgvector)
- [Ollama](https://ollama.ai/)
- [Swagger/OpenAPI](https://docs.nestjs.com/openapi/introduction)

## License

This project is part of the langchain-course-ws workspace.
