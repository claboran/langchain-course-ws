# API Development Assistant - gRPC Microservice

A gRPC-based microservice that provides AI-powered API development assistance using LangChain, LangGraph, and MCP (Model Context Protocol) tools.

## Features

- 🚀 **gRPC Streaming**: Server-side streaming for real-time chat responses
- 🤖 **LangChain Agent**: Intelligent agent with tool-calling capabilities
- 🔧 **MCP Integration**: Connect to Model Context Protocol servers for extended functionality
- 💾 **Redis Checkpointing**: Persistent conversation history with Redis
- 🔄 **Streaming Support**: Real-time token streaming for responsive UX
- 📊 **Token Usage Tracking**: Monitor and report token consumption
- 🎯 **Type-Safe**: Full TypeScript support with generated proto types

## Architecture

```
┌─────────────────┐
│  gRPC Client    │
└────────┬────────┘
         │ StreamChat / DeleteConversation
         ▼
┌─────────────────────────────────────┐
│     ChatController (gRPC)           │
│  - Pattern matching with ts-pattern │
│  - Event streaming                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        AgentService                 │
│  - LangGraph agent                  │
│  - Streaming orchestration          │
└─────┬──────────────────────┬────────┘
      │                      │
      ▼                      ▼
┌─────────────┐      ┌──────────────┐
│ MCP Client  │      │    Redis     │
│  Service    │      │ Checkpointer │
│             │      │              │
│ - Tool mgmt │      │ - State mgmt │
│ - LangChain │      │ - History    │
│   tools     │      │              │
└─────────────┘      └──────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- Redis server running
- Mistral AI API key
- MCP servers (optional, for extended tools)

### Installation

1. Install dependencies (already done at workspace level):
```bash
npm install
```

2. Generate proto types:
```bash
npm run proto:generate
```

3. Configure environment:
```bash
cp apps/api-dev-assistant-api/.env.example apps/api-dev-assistant-api/.env
# Edit .env with your configuration
```

### Configuration

#### Redis Setup

Start Redis using the provided docker-compose:
```bash
cd iac
docker-compose -f docker-compose.redis.yml up -d
```

Or use existing Redis:
```bash
# In .env
REDIS_URL=redis://localhost:6379
```

#### Mistral AI Configuration

Get your API key from [Mistral AI](https://console.mistral.ai/):

```bash
# In .env
MISTRAL_API_KEY=your_api_key_here
MODEL_NAME=mistral-large-latest
MODEL_TEMPERATURE=0.7
```

#### MCP Servers Configuration

Configure MCP servers in `.env` as a JSON array:
```bash
MCP_SERVERS_CONFIG=[
  {
    "name": "filesystem",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
  },
  {
    "name": "sqlite",
    "command": "uvx",
    "args": ["mcp-server-sqlite", "--db-path", "/path/to/db.sqlite"]
  }
]
```

## Running

### Development
```bash
npm run api-dev-assistant-api:dev
```

### Production Build
```bash
npm run api-dev-assistant-api:build
node dist/apps/api-dev-assistant-api/main.js
```

## Protocol

### gRPC Service Definition

```protobuf
service ChatService {
  rpc StreamChat (ChatRequest) returns (stream ChatChunk);
  rpc DeleteConversation (DeleteRequest) returns (DeleteResponse);
}
```

### StreamChat

Server-side streaming RPC that returns chunks of:
- **Text**: Incremental assistant responses
- **Tool Calls**: When the agent invokes MCP tools
- **Tool Results**: Results from tool execution
- **Metadata**: Final metadata with token usage
- **Errors**: Any errors during processing

### Message Flow

```
Client Request
     │
     ▼
┌────────────────┐
│  ChatRequest   │
│  - conv_id     │
│  - message     │
│  - metadata    │
└────────┬───────┘
         │
         ▼
┌──────────────────────────┐
│  Agent Processing        │
│  ┌─────────────────────┐ │
│  │ 1. Load history     │ │
│  │ 2. Add user message │ │
│  │ 3. LLM inference    │ │
│  │ 4. Tool calls?      │ │
│  │ 5. Execute tools    │ │
│  │ 6. Final response   │ │
│  └─────────────────────┘ │
└────────┬─────────────────┘
         │
         ▼ (streaming)
┌──────────────────┐
│  ChatChunk #1    │ → Text chunk
│  ChatChunk #2    │ → Tool call
│  ChatChunk #3    │ → Tool result
│  ChatChunk #4    │ → Text chunk
│  ChatChunk #N    │ → Metadata (final)
└──────────────────┘
```

## Project Structure

```
apps/api-dev-assistant-api/
├── src/
│   ├── app/
│   │   ├── chat/
│   │   │   └── chat.controller.ts      # gRPC controller
│   │   ├── langchain/
│   │   │   ├── agent.service.ts        # LangGraph agent
│   │   │   ├── redis-checkpointer.ts   # Redis state mgmt
│   │   │   └── redis.service.ts        # Redis connection
│   │   ├── mcp/
│   │   │   └── mcp-client.service.ts   # MCP integration
│   │   └── app.module.ts               # Main module
│   ├── generated/
│   │   └── chat.ts                     # Generated proto types
│   └── main.ts                         # gRPC server bootstrap
├── .env.example                        # Environment template
└── README.md
```

## Development

### Regenerate Proto Types
```bash
npm run proto:generate
```

### Testing the Service

Use a gRPC client like [grpcurl](https://github.com/fullstorydev/grpcurl) or [BloomRPC](https://github.com/bloomrpc/bloomrpc):

```bash
# List services
grpcurl -plaintext localhost:50051 list

# Stream chat
grpcurl -plaintext -d '{
  "conversation_id": "test-conv-1",
  "message": "Hello, can you help me create an API?"
}' localhost:50051 chat.ChatService/StreamChat
```

## Key Technologies

- **NestJS**: Framework for building scalable Node.js applications
- **gRPC**: High-performance RPC framework
- **LangChain**: Framework for building LLM applications
- **LangGraph**: Graph-based agent orchestration
- **MCP**: Model Context Protocol for tool integration
- **Redis**: In-memory data store for state management
- **ts-pattern**: Pattern matching for TypeScript
- **ts-proto**: Protocol buffers code generation

## Next Steps

1. **Client Implementation**: Build a gRPC client (Angular, React, etc.)
2. **Additional Tools**: Add more MCP servers for extended capabilities
3. **Monitoring**: Add metrics and observability
4. **Authentication**: Implement auth/authorization
5. **Rate Limiting**: Add rate limiting and quota management
6. **Deployment**: Containerize and deploy to cloud

## License

MIT
