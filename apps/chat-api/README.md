# Chat API

Multi-turn conversation API built with NestJS, LangChain, and LangGraph. This API provides contextual conversations with memory persistence and user personalization capabilities.

## Features

- **Multi-turn Conversations**: Maintains conversation history using LangChain's `createAgent` with LangGraph's `MemorySaver` checkpointer
- **User Personalization**: Includes a custom LangChain tool (`get_user_info`) that provides user information to the assistant for personalized responses
- **Conversation Threading**: Uses UUID-based conversation IDs to track and maintain separate conversation threads
- **Model Provider Integration**: Uses the `@langchain-course-ws/model-provider` library for ChatMistralAI integration
- **Interactive API Documentation**: Comprehensive Swagger UI with multiple request examples and detailed response schemas
- **Validation & Type Safety**: Request validation using class-validator with TypeScript DTOs
- **CORS Enabled**: Ready for frontend integration

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Mistral API key

### Installation

Dependencies are managed at the workspace root level.

### Configuration

Create a `.env` file in the workspace root:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
PORT=3311
```

### Running the API

```bash
# Development mode (with hot reload)
npx nx serve chat-api

# Build for production
npx nx build chat-api

# Run production build
node dist/chat-api/main.js
```

The API will be available at:
- **API Base URL**: `http://localhost:3311/api`
- **Swagger Documentation**: `http://localhost:3311/api/docs`

## API Documentation

### Swagger UI

The API includes comprehensive interactive documentation powered by Swagger UI. Visit `http://localhost:3311/api/docs` to:

- View detailed endpoint documentation
- See request/response schemas
- Try out the API directly from the browser
- Explore 3 pre-configured example requests:
  - First message in a conversation
  - Follow-up message with context
  - Personalized question using the user tool

### Endpoint: POST `/api/chat`

Send a message to the AI assistant and receive a response with full conversation context.

#### Request Body

```json
{
  "message": "Hello! Can you help me understand how multi-turn conversations work?",
  "user": "Alice Johnson",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The message from the user (1-5000 characters) |
| `user` | string | Yes | The name of the user sending the message. Used for personalization (1-100 characters) |
| `conversationId` | string (UUID) | Yes | UUID identifying the conversation thread. Use the same ID for all messages in a conversation to maintain context |

#### Response

```json
{
  "message": "Hello Alice Johnson! I'd be happy to help you understand multi-turn conversations. They allow us to maintain context across multiple exchanges, so I can remember what we've discussed earlier in our conversation.",
  "conversationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | The assistant's response message |
| `conversationId` | string (UUID) | The conversation ID that was used for this exchange |

#### HTTP Status Codes

- **200 OK**: Successfully received a response from the assistant
- **400 Bad Request**: Invalid input data (missing fields, invalid UUID format, etc.)
- **500 Internal Server Error**: Failed to get response from AI

## Usage Examples

### Example 1: Starting a New Conversation

```bash
curl -X POST http://localhost:3311/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! What can you help me with?",
    "user": "John Doe",
    "conversationId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Example 2: Continuing the Conversation

```bash
curl -X POST http://localhost:3311/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you tell me more about that?",
    "user": "John Doe",
    "conversationId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Note**: Use the same `conversationId` to maintain context.

### Example 3: Personalized Question

```bash
curl -X POST http://localhost:3311/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my name?",
    "user": "Alice Smith",
    "conversationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }'
```

The assistant will use the `get_user_info` tool to retrieve the user's name and respond with "Your name is Alice Smith."

## Architecture

### Technology Stack

- **Framework**: NestJS
- **LLM**: Mistral AI (via `@langchain/mistralai`)
- **Agent Framework**: LangChain with `createAgent`
- **Memory**: LangGraph's `MemorySaver` (in-memory checkpointer)
- **Validation**: class-validator with DTOs
- **Documentation**: Swagger/OpenAPI
- **Tools**: LangChain tool system

### How It Works

#### 1. LangChain Agent with Memory

The service uses LangChain's `createAgent` to create an AI agent with persistent conversation memory:

```typescript
const agent = createAgent({
  model: this.model,
  tools: [userInfoTool],
  checkpointer: this.checkpointer,
});

const config = { configurable: { thread_id: conversationId } };
const result = await agent.invoke(
  { messages: [{ role: 'user', content: message }] },
  config
);
```

**Key Components:**

- **Agent**: Orchestrates the conversation flow and tool usage
- **Checkpointer**: LangGraph's `MemorySaver` stores conversation history in-memory, keyed by `thread_id` (conversationId)
- **Tools**: Custom tools available to the assistant for enhanced functionality

#### 2. Short-term Memory

Each conversation is stored separately using the `conversationId` as the thread ID. The agent automatically:
- Maintains message history (system messages, user messages, assistant responses)
- Provides context to the LLM for each new message
- Enables the assistant to reference previous exchanges

Based on LangChain's short-term memory best practices: [Short-term Memory Documentation](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)

#### 3. User Info Tool

The assistant has access to a custom LangChain tool that provides user information for personalization:

```typescript
const userInfoTool = tool(
  async () => {
    return JSON.stringify({
      name: userName,
      timestamp: new Date().toISOString(),
    });
  },
  {
    name: 'get_user_info',
    description: 'Get information about the current user for personalized communication.',
    schema: z.object({}),
  }
);
```

**How it works:**
- The LLM can decide to call this tool when it needs user context
- The tool returns user information (name, timestamp)
- The assistant uses this information to provide personalized responses

### Project Structure

```
chat-api/
├── src/
│   ├── app/
│   │   └── app.module.ts         # Main application module
│   ├── chat/
│   │   ├── dto/
│   │   │   ├── chat-request.dto.ts   # Request validation & Swagger schema
│   │   │   └── chat-response.dto.ts  # Response schema
│   │   ├── chat.controller.ts    # REST endpoints with Swagger decorators
│   │   ├── chat.service.ts       # LangChain agent & memory logic
│   │   ├── chat.model.ts         # Structured output schema (Zod)
│   │   └── chat.module.ts        # Chat feature module
│   └── main.ts                   # Application bootstrap & Swagger setup
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

## Configuration

### Model Settings

The Mistral AI model is configured in `app.module.ts`:

```typescript
ModelProviderModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    apiKey: configService.get<string>('MISTRAL_API_KEY') || '',
    model: 'mistral-large-latest',
    temperature: 0.7,
  }),
})
```

**Parameters:**
- `model`: `mistral-large-latest` (supports tool calling)
- `temperature`: `0.7` (balanced between creativity and consistency)

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
npx nx build chat-api

# Build with verbose output
npx nx build chat-api --verbose
```

### Linting

```bash
# Run ESLint
npx nx lint chat-api
```

## Future Enhancements

- [ ] Add streaming responses using Server-Sent Events (SSE)
- [ ] Implement persistent storage for conversation history (PostgreSQL/Redis)
- [ ] Add conversation summarization for long threads
- [ ] Implement more tools (web search, calculations, etc.)
- [ ] Add authentication and user management
- [ ] Implement rate limiting
- [ ] Add conversation history retrieval endpoint (GET `/api/chat/:conversationId`)
- [ ] Add conversation deletion endpoint (DELETE `/api/chat/:conversationId`)
- [ ] Add structured output for responses (similar to hello-agent)
- [ ] Implement async processing with webhooks

## Related Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [LangChain JS Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangChain Short-term Memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory)
- [Mistral AI API](https://docs.mistral.ai/)
- [Swagger/OpenAPI](https://docs.nestjs.com/openapi/introduction)

## License

This project is part of the langchain-course-ws workspace.
