# API Development Assistant — gRPC Microservice

A NestJS gRPC microservice that provides AI-powered API development assistance. It uses **LangGraph** to orchestrate a stateful agent, **Mistral AI** as the LLM, **MCP (Model Context Protocol)** servers for tool access, **Redis** for persistent conversation history, and includes a full **Human-in-the-Loop (HITL)** review workflow for generated OpenAPI specifications.

The agent operates in two distinct phases on a single shared graph and conversation thread:

- **Phase 1 — Clarification**: conversational requirements gathering (unary gRPC, no streaming)
- **Phase 2 — API Design**: tool-augmented spec generation with HITL review (server-side streaming gRPC)

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Two-Phase Design](#two-phase-design)
   - [Phase 1 — Clarification](#phase-1--clarification)
   - [Phase 2 — API Design](#phase-2--api-design)
   - [Phase Transition](#phase-transition)
4. [LangGraph Agent](#langgraph-agent)
   - [Graph Topology](#graph-topology)
   - [Node Reference](#node-reference)
   - [Routing Functions](#routing-functions)
   - [Graph State Schema](#graph-state-schema)
5. [Human-in-the-Loop (HITL)](#human-in-the-loop-hitl)
   - [HITL Flow](#hitl-flow)
   - [HITL Data Contracts](#hitl-data-contracts)
6. [Intent Classification](#intent-classification)
7. [Streaming Pipeline](#streaming-pipeline)
   - [AgentEvent Types](#agentevent-types)
   - [Stream Processing State](#stream-processing-state)
8. [gRPC API Reference](#grpc-api-reference)
   - [Service Definition](#service-definition)
   - [StartConversation](#startconversation)
   - [ClarifyChat](#clarifychat)
   - [TransitionToApiPhase](#transitiontoapiphase)
   - [StreamChat](#streamchat)
   - [SendFeedback](#sendfeedback)
   - [DeleteConversation](#deleteconversation)
   - [ChatChunk Variants](#chatchunk-variants)
9. [MCP Integration](#mcp-integration)
   - [MCP Configuration](#mcp-configuration)
   - [Tool Naming Convention](#tool-naming-convention)
   - [JSON Schema → Zod Conversion](#json-schema--zod-conversion)
   - [HITL-Triggering Tools](#hitl-triggering-tools)
10. [Redis Checkpointing](#redis-checkpointing)
    - [Key Layout](#key-layout)
    - [TTL and Retention](#ttl-and-retention)
11. [Project Structure](#project-structure)
12. [Setup](#setup)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Configuration](#environment-configuration)
13. [Running](#running)
14. [Manual Testing with grpcurl](#manual-testing-with-grpcurl)
    - [Discover the Service](#discover-the-service)
    - [Full Two-Phase Workflow](#full-two-phase-workflow)
    - [Phase 2 Only (skip clarification)](#phase-2-only-skip-clarification)
    - [API Design with HITL](#api-design-with-hitl)
    - [Conversation Management](#conversation-management)
15. [Automated Tests](#automated-tests)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
16. [Key Technologies](#key-technologies)

---

## Features

- **Two-Phase Conversation** — Phase 1 gathers requirements conversationally (unary); Phase 2 does tool-augmented API design (streaming). Both phases share one `thread_id` and full conversation history via Redis
- **gRPC Streaming** — server-side streaming for real-time chat responses via `StreamChat` and `SendFeedback` RPCs; unary RPCs for `ClarifyChat` and `TransitionToApiPhase`
- **LangGraph Agent** — stateful, multi-turn agent graph with conditional routing, tool nodes, and interrupt support
- **Intent Classification** — keyword-based classifier routes each message to the optimal LLM invocation strategy (`api_design`, `refinement`, `general`)
- **Human-in-the-Loop (HITL)** — graph pauses after spec-generating tool calls and waits for human `approve` / `refine` / `reject` feedback before continuing
- **MCP Integration** — connects to any number of Model Context Protocol servers at startup; their tools are exposed to the LLM via LangChain's `DynamicStructuredTool`
- **Redis Checkpointing** — custom `BaseCheckpointSaver` persists full conversation state; conversations survive process restarts
- **Token Usage Tracking** — every stream ends with a `METADATA` event carrying prompt/completion token counts
- **Type-Safe proto** — generated TypeScript types from `chat.proto` via `ts-proto` (`npm run proto:generate`)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        gRPC Clients                              │
│   StartConversation │ StreamChat │ SendFeedback │ DeleteConversation
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   ChatController  (NestJS gRPC)                  │
│  • @GrpcMethod decorators on each RPC                            │
│  • Delegates streaming to chat-stream.util (mapEventToChunk)     │
│  • ts-pattern for exhaustive AgentEvent → ChatChunk mapping      │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AgentService                                 │
│  • Compiles the LangGraph StateGraph on bootstrap                │
│  • streamChat()         → runGraphStream() with new message      │
│  • resumeWithFeedback() → runGraphStream() with Command()        │
│  • deleteConversation() → delegates to CheckpointerService       │
└────────┬─────────────────────────────────┬────────────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────────┐         ┌──────────────────────────────────┐
│   MCPClientService  │         │        CheckpointerService       │
│  • Stdio transports │         │  • Owns RedisCheckpointer        │
│  • JSON Schema→Zod  │         │  • getCheckpointer()             │
│  • LangChain tools  │         │  • getMessageCount()             │
│  • Prompt listing   │         │  • deleteConversation()          │
└─────────────────────┘         └──────────────┬───────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │   RedisService   │
                                    │  (ioredis client │
                                    │   lifecycle)     │
                                    └──────────────────┘
```

---

## Two-Phase Design

```
Phase 1: Clarification  ──[TransitionToApiPhase]──▶  Phase 2: API Design
 ClarifyChat (unary gRPC)                             StreamChat (streaming gRPC)
         │                                                       │
         └────────── same conversationId / thread_id ───────────┘
                        (Redis checkpointer = full shared history)
```

Both phases run inside the **same `StateGraph`** using a `phase` field in state to drive routing at `START`. The conversation history accumulates across both phases — the API design phase sees everything the user said during clarification.

### Phase 1 — Clarification

The assistant acts as an API design consultant, gathering requirements through natural conversation before any tools are used:

- **Transport**: unary gRPC (`ClarifyChat`) — one request / one response per turn, no streaming
- **LLM behaviour**: tools available with `tool_choice: 'auto'` — the model decides when to call them (e.g. fetching API standards from MCP). No forcing
- **Persona**: creative, exploratory, asks targeted follow-up questions about purpose, resources, auth, validation, edge cases, consumers
- **Output format**: markdown and/or mermaid diagrams when they add clarity; plain prose otherwise
- **Routing**: `START → clarify → [tools → clarify]* → END`

### Phase 2 — API Design

The existing tool-augmented, streaming workflow — unchanged:

- **Transport**: server-side streaming gRPC (`StreamChat`, `SendFeedback`)
- **LLM behaviour**: intent-based tool forcing (`api_design` / `refinement` → `tool_choice: 'any'`)
- **Context**: the `clarificationSummary` (requirements contract) is injected into the system prompt, grounding the agent in what was agreed during Phase 1
- **Routing**: `START → classify → agent → [tools → after_tools → [human_review | agent]]* → END`

### Phase Transition

Triggered explicitly by the client when requirements are clear enough:

1. Client calls `TransitionToApiPhase(conversation_id)`
2. Server makes an LLM call to generate a structured requirements document (`clarificationSummary`) from the conversation history
3. `graph.updateState()` sets `phase: 'api_design'` and stores the summary
4. Response returns the summary so the client can display it
5. All subsequent `StreamChat` calls use the api_design routing

**Error handling**: if `TransitionToApiPhase` is called on a conversation with no messages, it transitions gracefully with an empty summary — the api_design phase still works, just without a requirements contract.

---

## LangGraph Agent

### Graph Topology

```
                          ┌─────────────────────────────────────────────────┐
                          │  Phase 1: Clarification (phase = 'clarification')│
                          │                                                   │
START ──[routeByPhase]──► clarify ──[shouldClarifyTools]──► tools ──┐        │
                          │   ▲                                      │        │
                          │   └──────────────────────────────────────┘        │
                          │   └──► END  (no tool calls)                       │
                          └─────────────────────────────────────────────────┘

                          ┌─────────────────────────────────────────────────────────┐
                          │  Phase 2: API Design (phase = 'api_design')             │
                          │                                                          │
START ──[routeByPhase]──► classify ──► agent ──► (no tool calls) ──► END            │
                                           │                                         │
                                           └──► (tool calls present)                │
                                                       │                            │
                                                     tools                          │
                                                       │                            │
                                              [routeAfterTools]                     │
                                                       │                            │
                                                  after_tools                       │
                                                       │                            │
                                         ┌─────────────┴─────────────┐             │
                                         │ (activeSpecId set)         │ (no spec)   │
                                         ▼                            ▼             │
                                   human_review                    agent ──► …      │
                                         │                                          │
                              ┌──────────┴──────────┐                              │
                              │  approve / reject    │  refine                      │
                              ▼                      ▼                              │
                             END                  agent ──► END                    │
                          └─────────────────────────────────────────────────────────┘
```

> **`tools` is shared between both phases.** `routeAfterTools` sends the result to `clarify` in Phase 1 and to `after_tools` in Phase 2.

### Node Reference

| Node | File | Phase | Responsibility |
|---|---|---|---|
| `clarify` | `agent-graph.util.ts` | Phase 1 | Conversational requirements-gathering; tools available with `auto` choice; emits markdown/mermaid responses |
| `classify` | `agent-graph.util.ts` | Phase 2 | Reads the latest `HumanMessage` and sets `state.intent` using `classifyIntent()` |
| `agent` | `agent-graph.util.ts` | Phase 2 | Invokes the LLM (default or forced-tool model depending on intent); injects `clarificationSummary` into system prompt |
| `tools` | LangGraph built-in `ToolNode` | Both | Executes all tool calls present in the last `AIMessage` and appends `ToolMessage`s |
| `after_tools` | `agent-graph.util.ts` | Phase 2 | Inspects the last `ToolMessage`; if it came from a spec-modifying tool, sets `state.activeSpecId` |
| `human_review` | `agent-graph.util.ts` | Phase 2 | Calls LangGraph `interrupt()` to pause the graph and surface a `HitlInterrupt` payload to the client |

### Routing Functions

| Function | Source → Targets | Logic |
|---|---|---|
| `routeByPhase` | `START` → `clarify` or `classify` | Checks `state.phase`; routes to `clarify` when `'clarification'`, `classify` when `'api_design'` |
| `shouldClarifyTools` | `clarify` → `tools` or `END` | Routes to `tools` if the last `AIMessage` has `tool_calls`, otherwise `END` |
| `routeAfterTools` | `tools` → `clarify` or `after_tools` | Returns `clarify` in clarification phase; `after_tools` in api_design phase |
| `shouldContinue` | `agent` → `tools` or `END` | Routes to `tools` if the last `AIMessage` contains `tool_calls`, otherwise `END` |
| `shouldAfterTools` | `after_tools` → `human_review` or `agent` | Routes to `human_review` when `state.activeSpecId` is set |
| `afterHumanReview` | `human_review` → `agent` or `END` | Routes back to `agent` when the last message is a `HumanMessage` (refine case), otherwise `END` |

### Graph State Schema

Defined in `agent.state.ts` using `Annotation.Root`:

```typescript
ApiAssistantState = {
  messages:             BaseMessage[];                              // LangGraph managed channel — auto-accumulated
  phase:                'clarification' | 'api_design';            // default: 'clarification'
  clarificationSummary: string | null;                             // generated at phase transition; injected into api_design system prompt
  intent:               'api_design' | 'refinement' | 'general' | null;
  activeSpecId:         string | null;
}
```

The state is fully serialized to / from Redis on every checkpoint write. `MessagesZodState` is attached for LangGraph 1.x runtime validation. The `phase` field defaults to `'clarification'` — all new conversations automatically start in Phase 1.

---

## Human-in-the-Loop (HITL)

### HITL Flow

```
1. Client sends StreamChat → agent calls create_openapi_spec or add_endpoint tool
2. after_tools node detects spec-modifying tool result → sets activeSpecId
3. human_review node calls interrupt() → graph suspends, writes state to Redis
4. Stream ends with an INTERRUPT ChatChunk (contains interruptId, specId, specTitle, endpointCount)
5. Client presents the spec to the human for review
6. Human chooses an action:
     approve → SendFeedback(action: "approve")
     refine  → SendFeedback(action: "refine", notes: "add auth endpoints")
     reject  → SendFeedback(action: "reject")
7. AgentService.resumeWithFeedback() wraps feedback in LangGraph Command({ resume: feedback })
8. Graph resumes at human_review with the feedback value
9. ts-pattern match inside human_review routes to the correct state mutation:
     approve → AIMessage("✅ Spec approved…")     + activeSpecId = null → END
     refine  → HumanMessage("Please refine…")     → agent → (may loop back)
     reject  → AIMessage("🗑️ Spec discarded…")   + activeSpecId = null → END
10. Client receives another streaming response via SendFeedback
```

### HITL Data Contracts

**Interrupt payload** (emitted from server to client as `InterruptChunk`):

```typescript
type HitlInterrupt = {
  interruptId:   string;   // UUID — opaque, pass back in FeedbackRequest
  specId:        string;   // ID of the spec in the MCP tool's storage
  specTitle:     string;   // Human-readable title extracted from tool result
  endpointCount: number;   // Number of endpoints in the generated spec
};
```

**Feedback payload** (sent from client to server in `FeedbackRequest`):

```typescript
type HitlFeedback = {
  interruptId: string;                          // Must match the interrupt being resolved
  action:      'approve' | 'refine' | 'reject';
  notes?:      string;                          // Required when action === 'refine'
};
```

**Spec-modifying tool detection** — `SPEC_MODIFYING_SUFFIXES` in `agent.state.ts`:

```typescript
export const SPEC_MODIFYING_SUFFIXES = ['create_openapi_spec', 'add_endpoint'];
```

Any MCP tool whose name ends with one of these suffixes triggers the HITL path after execution.

---

## Intent Classification

`classifyIntent()` in `agent.util.ts` performs a simple keyword scan on each incoming message:

| Intent | Regex pattern | Model behavior |
|---|---|---|
| `refinement` | `/\b(refine\|update\|change\|modify\|adjust\|add endpoint\|remove)\b/` | `forcedModel` — Mistral must call at least one tool (`tool_choice: 'any'`) |
| `api_design` | `/\b(openapi\|api\|spec\|endpoint\|resource\|crud\|rest\|swagger)\b/` | `forcedModel` |
| `general` | _(fallback)_ | `defaultModel` — Mistral may optionally call tools |

The `classify` node runs first on every graph invocation and writes the result to `state.intent`. The `agent` node reads this to select `defaultModel` or `forcedModel`.

---

## Streaming Pipeline

### AgentEvent Types

The internal `AgentEvent` union (in `agent.state.ts`) is converted to `ChatChunk` proto messages by `mapEventToChunk()` in `chat-stream.util.ts`:

| `AgentEventType` | `ChatChunk` field | `isFinal` | Description |
|---|---|---|---|
| `TEXT_CHUNK` | `text` | `false` | Incremental assistant text |
| `TOOL_CALL` | `tool_call` | `false` | Agent is about to invoke an MCP tool |
| `TOOL_RESULT` | `tool_result` | `false` | Result returned by the MCP tool |
| `INTERRUPT` | `interrupt` | `false` | Graph paused — human review required |
| `METADATA` | `metadata` | **`true`** | Final event with token usage, message count, model |
| `ERROR` | `error` | **`true`** | Unrecoverable error during graph execution |

### Stream Processing State

`StreamProcessingState` (in `agent.state.ts`) is a mutable accumulator passed through the RxJS pipeline:

```typescript
type StreamProcessingState = {
  sequence:         number;       // Monotonically increasing event counter
  hasToolCalls:     boolean;      // True if any TOOL_CALL was emitted
  promptTokens:     number;       // Accumulated input tokens
  completionTokens: number;       // Accumulated output tokens
  processedIds:     Set<string>;  // Deduplication: prevents re-emitting state snapshots
  interruptEmitted: boolean;      // Prevents double-emission of INTERRUPT events
};
```

**Pipeline assembly** (`buildGraphStream` in `agent-pipeline.util.ts`):

```
graph.stream(input, config)   (AsyncIterable<ApiAssistantStateType>)
      │
      └─ switchMap → from(stream)
            │
            └─ concatMap → processStateSnapshot()
                  │  converts each LangGraph state snapshot to AgentEvents[]
                  │
                  └─ catchError → errorEvent()
                        │
concat ──────────────────┘
      │
      └─ postStream$ (defer):
            1. pendingInterruptEvents()   ← check graph.getState() for missed interrupts
            2. getMessageCount()          ← read checkpoint for total message count
            3. metadataEvent()            ← emit final METADATA
```

---

## gRPC API Reference

### Service Definition

```protobuf
service ChatService {
  // Conversation lifecycle
  rpc StartConversation  (StartConversationRequest) returns (StartConversationResponse);
  rpc DeleteConversation (DeleteRequest)            returns (DeleteResponse);

  // Phase 1 — Clarification (unary)
  rpc ClarifyChat        (ChatRequest)              returns (ClarifyResponse);
  rpc TransitionToApiPhase (TransitionRequest)      returns (TransitionResponse);

  // Phase 2 — API Design (streaming)
  rpc StreamChat         (ChatRequest)              returns (stream ChatChunk);
  rpc SendFeedback       (FeedbackRequest)          returns (stream ChatChunk);
}
```

### StartConversation

Unary RPC. Creates a new conversation and returns a backend-generated UUID.

```protobuf
message StartConversationRequest {
  map<string, string> metadata = 1;   // Optional client metadata
}
message StartConversationResponse {
  string conversation_id = 1;
}
```

Always call this first to get a `conversation_id` before calling `ClarifyChat` or `StreamChat`.

### ClarifyChat

Unary RPC. Sends one turn to the clarification consultant and returns a complete response. Uses the same `ChatRequest` as `StreamChat`.

```protobuf
// Request — same as StreamChat
message ChatRequest {
  string conversation_id = 1;
  string message = 2;
  map<string, string> metadata = 3;
}

message ClarifyResponse {
  string content         = 1;  // markdown / mermaid response
  bool   has_markdown    = 2;  // true when content uses markdown formatting
  bool   has_mermaid     = 3;  // true when content contains a ```mermaid block
  string conversation_id = 4;
}
```

The graph routes to the `clarify` node (Phase 1). If the model calls tools internally, they execute and the conversation loops back to `clarify` before returning — the client always receives a single complete response.

### TransitionToApiPhase

Unary RPC. Signals that requirements gathering is complete. The server:

1. Reads the full clarification conversation from Redis
2. Calls the LLM to generate a structured requirements document
3. Writes `phase: 'api_design'` and `clarificationSummary` to graph state
4. Returns the summary to the client

```protobuf
message TransitionRequest {
  string conversation_id = 1;
}

message TransitionResponse {
  string conversation_id       = 1;
  string clarification_summary = 2;  // structured markdown requirements doc
}
```

After this call, all subsequent `StreamChat` / `SendFeedback` calls on the same `conversation_id` use the Phase 2 routing. The `clarificationSummary` is automatically injected into the API design agent's system prompt.

### StreamChat

Server-side streaming RPC. Sends a user message and streams back the agent's response.

```protobuf
message ChatRequest {
  string conversation_id = 1;
  string message = 2;
  map<string, string> metadata = 3;
}
```

The stream emits `ChatChunk` messages in sequence and terminates with a `METADATA` chunk (`is_final = true`). If the agent generates an OpenAPI spec, an `interrupt` chunk appears before the `metadata` chunk, and the stream ends. The client must then call `SendFeedback` to continue.

### SendFeedback

Server-side streaming RPC. Resumes a graph paused at a HITL interrupt.

```protobuf
message FeedbackRequest {
  string conversation_id = 1;
  string interrupt_id = 2;      // From the InterruptChunk received in StreamChat
  string action = 3;            // "approve" | "refine" | "reject"
  string notes = 4;             // Required when action = "refine"
}
```

Returns a stream of `ChatChunk` messages (same format as `StreamChat`). For `approve` and `reject`, the stream is short (one `TEXT_CHUNK` + one `METADATA`). For `refine`, the agent re-invokes the LLM and may call tools again.

### DeleteConversation

Unary RPC. Deletes all Redis keys for a conversation (checkpoints + pending writes).

```protobuf
message DeleteRequest  { string conversation_id = 1; }
message DeleteResponse { string message = 1; int32 messages_deleted = 2; }
```

### ChatChunk Variants

```
ChatChunk
  ├── text        TextChunk     { content, role }
  ├── tool_call   ToolCall      { tool_id, tool_name, arguments, status }
  ├── tool_result ToolResult    { tool_id, tool_name, result, success, error_message }
  ├── interrupt   InterruptChunk{ interrupt_id, spec_id, spec_title, endpoint_count, message }
  ├── metadata    Metadata      { conversation_id, message_count, has_markdown,
  │                               has_tool_calls, token_usage, timestamp, model }
  └── error       ErrorInfo     { code, message, details, retryable }
```

`ToolCall.status` enum: `PENDING(0)`, `IN_PROGRESS(1)`, `COMPLETED(2)`, `FAILED(3)`.

---

## MCP Integration

### MCP Configuration

MCP servers are configured via the `MCP_SERVERS_CONFIG` environment variable as a JSON array:

```json
[
  {
    "name": "api-dev-mcp",
    "command": "npx",
    "args": ["-y", "@your-org/api-dev-mcp-server", "--workspace", "/path/to/specs"]
  },
  {
    "name": "filesystem",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
  }
]
```

Each server is connected via a `StdioClientTransport` on module init. All tools from all servers are loaded and registered at startup. Connection failures are logged as errors but do not prevent the service from starting (the agent runs with fewer tools).

### Tool Naming Convention

To avoid collisions across multiple MCP servers, tools are registered internally as:

```
{serverName}__{toolName}
```

Example: server `api-dev-mcp` with tool `create_openapi_spec` → key `api-dev-mcp__create_openapi_spec`.

This compound key is what the LLM sees as the tool name and what appears in `TOOL_CALL` / `TOOL_RESULT` stream events.

### JSON Schema → Zod Conversion

`MCPClientService` contains a `jsonSchemaToZod()` function that converts MCP tool input schemas (JSON Schema) to Zod schemas. This enables LangChain's `DynamicStructuredTool` to validate inputs before passing them to the MCP server.

Supported JSON Schema types: `string` (with `minLength`, `maxLength`, `description`), `number` / `integer`, `boolean`, `array`, `object` (with `required` fields), `enum`.

### HITL-Triggering Tools

After every tool execution, `makeAfterToolsNode()` checks whether the tool name ends with a suffix from `SPEC_MODIFYING_SUFFIXES`:

```typescript
export const SPEC_MODIFYING_SUFFIXES = ['create_openapi_spec', 'add_endpoint'];
```

If matched, the tool result is parsed for a `specId` field and stored in `state.activeSpecId`. The router then directs execution to `human_review`, pausing the graph.

---

## Redis Checkpointing

`RedisCheckpointer` extends LangGraph's `BaseCheckpointSaver`. It stores the full graph state in Redis using a custom JSON serializer.

### Key Layout

```
langgraph:checkpoint:{threadId}:{checkpointId}        ← Checkpoint data (JSON string)
langgraph:checkpoint:{threadId}:index                 ← Sorted set ordered by insertion timestamp
langgraph:writes:{threadId}:{checkpointId}:{taskId}   ← Pending writes between node transitions
```

- **`getTuple()`** — reads the latest checkpoint ID from the sorted set index, then fetches and deserializes the checkpoint data.
- **`list()`** — yields checkpoints in reverse chronological order via `ZREVRANGE`.
- **`put()`** — atomically writes the checkpoint and updates the index using a Redis pipeline.
- **`putWrites()`** — stores pending writes (intermediate node outputs) between checkpoints.
- **`deleteThread()`** — scans all matching keys with `SCAN` cursors (non-blocking) and deletes them in a single `DEL` call.
- **`getMessageCount()`** — counts messages in `channel_values.messages` of the latest checkpoint.

### TTL and Retention

All Redis keys are created with a **30-day TTL** (`30 * 24 * 60 * 60` seconds). The TTL is refreshed on every write.

The `RedisService` wraps the `ioredis` client with connection retry logic (`retryStrategy: times => Math.min(times * 50, 2000)`, max 3 retries per request) and lifecycle hooks (`onModuleInit` / `onModuleDestroy`).

---

## Project Structure

```
apps/api-dev-assistant-api/
├── src/
│   ├── app/
│   │   ├── chat/
│   │   │   ├── chat.controller.ts               # gRPC controller — 4 RPC methods
│   │   │   ├── chat-stream.util.ts              # streamChatChunks() + mapEventToChunk()
│   │   │   └── chat.controller.spec.ts          # Unit tests for the controller
│   │   ├── langchain/
│   │   │   ├── agent.service.ts                 # Compiles graph; streamChat / resumeWithFeedback
│   │   │   ├── agent.service.spec.ts            # Unit tests for AgentService
│   │   │   ├── agent.state.ts                   # State schema, AgentEvent types, HITL types
│   │   │   ├── agent.util.ts                    # classifyIntent, buildSystemPrompt, extractors
│   │   │   ├── agent.util.spec.ts               # Unit tests for agent utilities
│   │   │   ├── agent-graph.util.ts              # Node factories + routing functions
│   │   │   ├── agent-graph.util.spec.ts         # Unit tests for graph nodes/routers
│   │   │   ├── agent-graph.integration.spec.ts  # Integration: 5 full graph flows
│   │   │   ├── agent-pipeline.util.ts           # buildGraphStream, processStateSnapshot
│   │   │   ├── agent-pipeline.util.spec.ts      # Unit tests for pipeline utilities
│   │   │   ├── redis-checkpointer.ts            # Custom BaseCheckpointSaver for Redis
│   │   │   ├── redis-checkpointer.integration.spec.ts
│   │   │   ├── checkpointer.service.ts          # NestJS service wrapping RedisCheckpointer
│   │   │   ├── redis.service.ts                 # ioredis client lifecycle
│   │   │   └── redis.service.integration.spec.ts
│   │   ├── mcp/
│   │   │   ├── mcp-client.service.ts            # MCP connection manager + tool/prompt access
│   │   │   └── mcp-client.service.spec.ts
│   │   └── app.module.ts                        # NestJS root module
│   ├── generated/
│   │   └── chat.ts                              # ts-proto generated types from chat.proto
│   └── main.ts                                  # gRPC server bootstrap (port 50051)
├── .env.example
├── project.json                                 # Nx project configuration
├── tsconfig.json / tsconfig.app.json
├── vite.config.mts
├── vitest.config.ts                             # Unit test config
└── vitest.integration.config.ts                 # Integration test config

proto/chat.proto                                 # Workspace root — shared proto definition
```

---

## Setup

### Prerequisites

- Node.js 18+
- Redis 6+ (local or Docker)
- Mistral AI API key from [console.mistral.ai](https://console.mistral.ai/)
- MCP servers (optional — the agent runs with limited capabilities without them)
- [`grpcurl`](https://github.com/fullstorydev/grpcurl) for manual testing (optional)

### Installation

Dependencies are managed at the workspace root:

```bash
npm install
```

Generate TypeScript types from the proto definition:

```bash
npm run proto:generate
```

### Environment Configuration

```bash
cp apps/api-dev-assistant-api/.env.example apps/api-dev-assistant-api/.env
```

Edit `.env`:

```bash
# gRPC Server
PORT=50051

# Redis
REDIS_URL=redis://localhost:6379

# Mistral AI
MISTRAL_API_KEY=your_api_key_here
MODEL_NAME=mistral-large-latest
MODEL_TEMPERATURE=0.7

# MCP Servers (JSON array — empty array = no tools)
MCP_SERVERS_CONFIG=[{"name":"api-dev-mcp","command":"npx","args":["-y","@your-org/api-dev-mcp-server"]}]
```

Start Redis with Docker Compose:

```bash
cd iac
docker-compose -f docker-compose.redis.yml up -d
```

---

## Running

### Development (ts-node, no build step)

```bash
npx nx serve api-dev-assistant-api
```

### Production Build

```bash
npx nx build api-dev-assistant-api
node dist/apps/api-dev-assistant-api/main.js
```

The gRPC server listens on `0.0.0.0:50051`.

---

## Manual Testing with grpcurl

[`grpcurl`](https://github.com/fullstorydev/grpcurl) is the recommended CLI for exercising the gRPC API by hand. Install it via `brew install grpcurl` or download a binary from the releases page.

All examples below assume the service is running on `localhost:50051` and the proto file is at `proto/chat.proto` from the workspace root. Run all `grpcurl` commands from the **workspace root** so the `-import-path` / `-proto` flags resolve correctly.

```bash
# Convenience alias used in all examples below
PROTO_FLAGS="-plaintext -import-path ./proto -proto chat.proto"
```

### Discover the Service

```bash
grpcurl -plaintext localhost:50051 list
# chat.ChatService

grpcurl -plaintext localhost:50051 list chat.ChatService
# chat.ChatService.ClarifyChat
# chat.ChatService.DeleteConversation
# chat.ChatService.SendFeedback
# chat.ChatService.StartConversation
# chat.ChatService.StreamChat
# chat.ChatService.TransitionToApiPhase

# Inspect a message type
grpcurl -plaintext localhost:50051 describe chat.ClarifyResponse
grpcurl -plaintext localhost:50051 describe chat.ChatChunk
```

### Full Two-Phase Workflow

This is the recommended way to use the service — clarify requirements first, then generate the spec.

**Step 1 — Start a conversation:**

```bash
grpcurl -plaintext \
  -d '{}' \
  localhost:50051 chat.ChatService/StartConversation
```

```json
{ "conversationId": "550e8400-e29b-41d4-a716-446655440000" }
```

Save the ID: `CONV_ID=550e8400-e29b-41d4-a716-446655440000`

**Step 2 — Phase 1: Clarification turns (unary, repeat as needed):**

```bash
# First message — describe what you want to build
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "I want to build an API for a recipe management app"
  }' \
  localhost:50051 chat.ChatService/ClarifyChat
```

The response is a single `ClarifyResponse` — no streaming:

```json
{
  "content": "Great! To make sure I understand the scope...\n\n**Who are the consumers?** ...",
  "hasMarkdown": true,
  "hasMermaid": false,
  "conversationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Continue the clarification conversation — each call is unary:

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Users can create recipes with ingredients and steps. They can also save favourites. No auth needed for reading, but users must register to create content."
  }' \
  localhost:50051 chat.ChatService/ClarifyChat
```

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Recipes have a title, description, servings count, prep time, and a list of steps. Each step has a description and optional duration."
  }' \
  localhost:50051 chat.ChatService/ClarifyChat
```

**Step 3 — Transition to Phase 2:**

When you're satisfied with the requirements, trigger the transition. The server generates a requirements document from the conversation and flips the phase:

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
  }' \
  localhost:50051 chat.ChatService/TransitionToApiPhase
```

```json
{
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "clarificationSummary": "## API Requirements\n\n### Purpose\nRecipe management application...\n\n### Resources\n- **Recipe** — title, description, servings, prep_time, steps[]\n- **Step** — description, duration (optional)\n- **User** — registration required for write operations\n...\n"
}
```

Review the summary — this is the contract the API design agent will work from.

**Step 4 — Phase 2: Design the API (streaming):**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Generate the OpenAPI spec for the recipe API we discussed"
  }' \
  localhost:50051 chat.ChatService/StreamChat
```

You will receive a stream of `ChatChunk` messages:
- `tool_call` — agent is calling `create_openapi_spec` with the requirements as context
- `tool_result` — spec was created and stored
- `interrupt` — graph paused for HITL review (see below)
- `metadata` (`is_final: true`) — token usage summary

### Phase 2 Only (skip clarification)

If you already know exactly what you want, you can skip Phase 1 entirely. Just transition immediately after starting the conversation — the summary will be empty, and the agent will work from your `StreamChat` messages alone:

```bash
# Start conversation
grpcurl -plaintext -d '{}' localhost:50051 chat.ChatService/StartConversation
# { "conversationId": "aabbccdd-..." }

# Transition immediately (empty clarification = empty summary, api_design phase)
grpcurl -plaintext \
  -d '{ "conversation_id": "aabbccdd-..." }' \
  localhost:50051 chat.ChatService/TransitionToApiPhase

# Go straight to StreamChat
grpcurl -plaintext \
  -d '{
    "conversation_id": "aabbccdd-...",
    "message": "Design a REST API for a todo app with users and tasks"
  }' \
  localhost:50051 chat.ChatService/StreamChat
```

### API Design with HITL

This scenario demonstrates the full Human-in-the-Loop review cycle within Phase 2. Assumes you have already called `TransitionToApiPhase` and the conversation is in `api_design` phase.

**1. Ask the agent to design an API (or continue from the two-phase workflow above):**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Generate the OpenAPI spec for the recipe API we discussed"
  }' \
  localhost:50051 chat.ChatService/StreamChat
```

The agent will call the `create_openapi_spec` MCP tool. The stream will include:
- A `tool_call` chunk (tool invocation)
- A `tool_result` chunk (spec was created)
- An **`interrupt` chunk** — the graph is now paused:

```json
{
  "interrupt": {
    "interruptId": "b3d9f1a2-...",
    "specId": "spec-abc123",
    "specTitle": "Todo Application API",
    "endpointCount": 8,
    "message": "Please review the generated OpenAPI specification..."
  },
  "isFinal": false,
  "sequence": 3
}
```

- A final `metadata` chunk

**Copy the `interruptId` from the stream — you need it for the next call.**

**2a. Approve the generated spec:**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "interrupt_id": "b3d9f1a2-...",
    "action": "approve"
  }' \
  localhost:50051 chat.ChatService/SendFeedback
```

Response stream: a `text` chunk confirming approval + a `metadata` chunk.

**2b. Request refinements instead:**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "interrupt_id": "b3d9f1a2-...",
    "action": "refine",
    "notes": "Add authentication endpoints (login, logout, token refresh) and include rate limiting headers in all responses"
  }' \
  localhost:50051 chat.ChatService/SendFeedback
```

The agent loops back, calls the MCP tool again, and emits another `interrupt` chunk for the updated spec. Repeat the feedback cycle as many times as needed.

**2c. Reject the spec:**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "interrupt_id": "b3d9f1a2-...",
    "action": "reject"
  }' \
  localhost:50051 chat.ChatService/SendFeedback
```

Response stream: a `text` chunk confirming the spec was discarded + a `metadata` chunk.

**3. Add an endpoint to an existing spec:**

Sending a message with refinement keywords (`add endpoint`, `update`, `modify`) forces the model to use tools:

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Add endpoint for bulk task deletion"
  }' \
  localhost:50051 chat.ChatService/StreamChat
```

If the MCP tool used is `add_endpoint`, another HITL interrupt is triggered.

### Conversation Management

**Check which phase a conversation is currently in:**

There is no dedicated RPC for this — but you can infer it from the response type. If `ClarifyChat` returns a `ClarifyResponse`, the conversation is still in Phase 1. After `TransitionToApiPhase`, all subsequent calls route through Phase 2.

**Delete a conversation and its Redis state:**

```bash
grpcurl -plaintext \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
  }' \
  localhost:50051 chat.ChatService/DeleteConversation
```

Response:
```json
{
  "message": "Conversation 550e8400-... deleted successfully",
  "messagesDeleted": 12
}
```

**Pass client metadata (e.g., user ID, client version):**

```bash
grpcurl -plaintext \
  -d '{
    "metadata": {
      "userId": "user-42",
      "clientVersion": "1.0.0"
    }
  }' \
  localhost:50051 chat.ChatService/StartConversation
```

---

## Automated Tests

### Unit Tests

Run the full unit test suite:

```bash
npx nx test api-dev-assistant-api
```

Unit tests use **Vitest** and cover:

| File | What is tested |
|---|---|
| `agent.util.spec.ts` | `classifyIntent`, `buildSystemPrompt`, `extractSpecId`, `extractSpecTitle`, `extractEndpointCount`, `msgType` |
| `agent-graph.util.spec.ts` | Node factory outputs, routing functions (`shouldContinue`, `shouldAfterTools`, `afterHumanReview`), `buildInterruptEvent` |
| `agent-pipeline.util.spec.ts` | `processStateSnapshot` deduplication, AI/tool/interrupt event builders, `metadataEvent`, `errorEvent` |
| `agent.service.spec.ts` | Graph compilation, `streamChat` / `resumeWithFeedback` delegation |
| `chat.controller.spec.ts` | gRPC controller method delegation and error handling |
| `mcp-client.service.spec.ts` | Config loading, tool registration, `jsonSchemaToZod` conversion |

### Integration Tests

Integration tests require a running Redis instance and are separated into their own Vitest config:

```bash
npx nx run api-dev-assistant-api:test --config vitest.integration.config.ts
```

| File | What is tested |
|---|---|
| `agent-graph.integration.spec.ts` | 5 full end-to-end graph flows using `MemorySaver` and a fake LLM (no Redis, no Mistral API): |
| | Flow 1 — Simple text response (`TEXT_CHUNK` + `METADATA`) |
| | Flow 2 — Tool call without HITL (`TOOL_CALL` + `TOOL_RESULT` + `TEXT_CHUNK` + `METADATA`) |
| | Flow 3 — HITL approve (interrupt → resume → approval `TEXT_CHUNK`) |
| | Flow 4 — HITL refine (interrupt → resume → agent re-invocation → `TEXT_CHUNK`) |
| | Flow 5 — HITL reject (interrupt → resume → discard `TEXT_CHUNK`) |
| `redis-checkpointer.integration.spec.ts` | `put`, `getTuple`, `list`, `deleteThread`, `getMessageCount` against a real Redis instance |
| `redis.service.integration.spec.ts` | `RedisService` connection lifecycle |

---

## Key Technologies

| Technology | Role |
|---|---|
| **NestJS** | Microservice framework; DI, lifecycle hooks, `@GrpcMethod` decorators |
| **gRPC / protobuf** | Transport layer; server-side streaming for real-time events |
| **LangChain** | LLM abstraction (`ChatMistralAI`, `DynamicStructuredTool`, message types) |
| **LangGraph** | Stateful agent graph; `StateGraph`, `ToolNode`, `interrupt()`, `Command({ resume })` |
| **Mistral AI** | LLM provider; supports `tool_choice: 'any'` for forced tool invocation |
| **MCP SDK** | `@modelcontextprotocol/sdk` — `Client` + `StdioClientTransport` |
| **Redis / ioredis** | Persistent conversation state; custom `BaseCheckpointSaver` implementation |
| **ts-pattern** | Exhaustive pattern matching for `AgentEvent → ChatChunk` and HITL routing |
| **Zod** | Runtime validation for graph state, HITL types, and MCP tool input schemas |
| **RxJS** | Streaming pipeline (`defer`, `concat`, `switchMap`, `concatMap`, `catchError`) |
| **Vitest** | Unit and integration test runner |
| **ts-proto** | Protocol buffers TypeScript code generation |
| **Vite** | Production build tooling |
