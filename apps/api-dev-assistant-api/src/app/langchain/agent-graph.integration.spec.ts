/**
 * Agent graph integration tests
 *
 * Strategy:
 *  - Compile the graph from the same node-factory functions used in production.
 *  - Swap in MemorySaver (no Redis) and a SequentialFakeModel (no LLM API).
 *  - Collect AgentEvents via buildGraphStream and assert on event types / data.
 *
 * Covered flows:
 *  1. Simple text response  — classify → agent → END
 *  2. Tool call path        — classify → agent → tools → after_tools → agent → END
 *  3. HITL approve          — interrupt → resume approve → END
 *  4. HITL refine           — interrupt → resume refine → agent → END
 *  5. HITL reject           — interrupt → resume reject → END
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { START, END, StateGraph, MemorySaver, Command } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { lastValueFrom, toArray } from 'rxjs';
import { Logger } from '@nestjs/common';
import {
  makeClassifyNode,
  makeCallModelNode,
  makeAfterToolsNode,
  makeHumanReviewNode,
  shouldContinue,
  shouldAfterTools,
  afterHumanReview,
} from './agent-graph.util';
import {
  ApiAssistantState,
  AgentEventType,
} from './agent.state';
import {
  buildGraphStream,
  makeStreamProcessingState,
} from './agent-pipeline.util';

// ---------------------------------------------------------------------------
// createFakeModel
//
// Returns a plain object that satisfies the duck-typed model interface used by
// makeCallModelNode (which types the model as `any`). Avoids extending
// FakeListChatModel because bindTools() on that class returns a RunnableBinding
// whose invoke() wraps the response and loses the `tool_calls` property.
// ---------------------------------------------------------------------------

const createFakeModel = (responses: BaseMessage[]) => {
  let idx = 0;
  const model: any = {
    invoke: async (_input: any) => responses[idx++ % responses.length],
    // bindTools must return the same model so the graph compilation doesn't fail
    bindTools: () => model,
  };
  return model;
};

// ---------------------------------------------------------------------------
// Fake MCP tool: create_openapi_spec
// Name must end with "create_openapi_spec" to trigger the HITL path.
// ---------------------------------------------------------------------------

const fakeCreateSpecTool = tool(
  async (_args) =>
    JSON.stringify({
      success: true,
      specId: 'spec-integration-test',
      message: 'Created OpenAPI specification: "Integration Test API"',
      summary: { title: 'Integration Test API', endpoints: 3 },
    }),
  {
    name: 'api-dev-mcp__create_openapi_spec',
    description: 'Create an OpenAPI spec (fake for tests)',
    schema: z.object({ title: z.string().optional() }),
  },
);

// ---------------------------------------------------------------------------
// Graph factory — mirrors AgentService.createAgent() without NestJS DI
// ---------------------------------------------------------------------------

const makeTestGraph = (model: any, tools: any[] = []) => {
  const systemPrompt = 'You are a test assistant.';

  const classify    = makeClassifyNode();
  // Pass the raw model for both default and forced — bindTools is skipped in tests
  // because our fake model already returns predetermined responses.
  const callModel   = makeCallModelNode(systemPrompt, model, model, tools);
  const afterTools  = makeAfterToolsNode();
  const humanReview = makeHumanReviewNode();
  const toolNode    = new ToolNode(tools);

  return new StateGraph(ApiAssistantState)
    .addNode('classify',     classify)
    .addNode('agent',        callModel)
    .addNode('tools',        toolNode)
    .addNode('after_tools',  afterTools)
    .addNode('human_review', humanReview)
    .addEdge(START, 'classify')
    .addEdge('classify', 'agent')
    .addConditionalEdges('agent',        shouldContinue,   ['tools', END])
    .addEdge('tools', 'after_tools')
    .addConditionalEdges('after_tools',  shouldAfterTools, ['human_review', 'agent'])
    .addConditionalEdges('human_review', afterHumanReview, ['agent', END]);
};

// ---------------------------------------------------------------------------
// Shared test infrastructure
// ---------------------------------------------------------------------------

const mockLogger = {
  log:   () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

/** Collect all AgentEvents produced by buildGraphStream into an array. */
const collectEvents = (input: any, graph: any, threadId: string) => {
  const config = { configurable: { thread_id: threadId }, streamMode: 'values' as const };
  const shared = makeStreamProcessingState();
  const deps = {
    graph,
    config,
    conversationId: threadId,
    modelName: 'fake-model',
    getMessageCount: async () => 1,
    logger: mockLogger,
  };
  return lastValueFrom(buildGraphStream(input, config, shared, deps).pipe(toArray()));
};

// ---------------------------------------------------------------------------
// Flow 1 — Simple text response
// ---------------------------------------------------------------------------

describe('simple text response', () => {
  let graph: any;

  beforeEach(() => {
    const model = createFakeModel([new AIMessage('Here is your answer.')]);
    graph = makeTestGraph(model).compile({ checkpointer: new MemorySaver() });
  });

  it('emits TEXT_CHUNK and METADATA events', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('What is REST?')] },
      graph,
      'thread-text-1',
    );

    const types = events.map((e) => e.type);
    expect(types).toContain(AgentEventType.TEXT_CHUNK);
    expect(types).toContain(AgentEventType.METADATA);
  });

  it('does not emit TOOL_CALL or INTERRUPT events', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Hello')] },
      graph,
      'thread-text-2',
    );
    const types = events.map((e) => e.type);
    expect(types).not.toContain(AgentEventType.TOOL_CALL);
    expect(types).not.toContain(AgentEventType.INTERRUPT);
  });

  it('TEXT_CHUNK contains the model response', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Hello')] },
      graph,
      'thread-text-3',
    );
    const textChunk = events.find((e) => e.type === AgentEventType.TEXT_CHUNK);
    expect(textChunk?.data.content).toBe('Here is your answer.');
    expect(textChunk?.data.role).toBe('assistant');
  });

  it('METADATA is the last event and isFinal is true', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Hello')] },
      graph,
      'thread-text-4',
    );
    const last = events.at(-1);
    expect(last?.type).toBe(AgentEventType.METADATA);
    expect(last?.isFinal).toBe(true);
  });

  it('events are numbered sequentially from 0', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Hello')] },
      graph,
      'thread-text-5',
    );
    events.forEach((e, i) => expect(e.sequence).toBe(i));
  });
});

// ---------------------------------------------------------------------------
// Flow 2 — Tool call → after_tools → back to agent (no HITL)
// ---------------------------------------------------------------------------

describe('tool call without HITL', () => {
  let graph: any;

  beforeEach(() => {
    const validateTool = tool(
      async () => JSON.stringify({ valid: true, errors: [] }),
      {
        name: 'api-dev-mcp__validate_spec',
        description: 'Validate an OpenAPI spec',
        schema: z.object({ specId: z.string() }),
      },
    );

    const model = createFakeModel([
      // First call: return tool call (validate_spec does NOT trigger HITL)
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'tc-1', name: 'api-dev-mcp__validate_spec', args: { specId: 'spec-1' }, type: 'tool_call' }],
      }),
      // Second call (after tool result): return plain text
      new AIMessage('The spec looks valid!'),
    ]);

    graph = makeTestGraph(model, [validateTool]).compile({ checkpointer: new MemorySaver() });
  });

  it('emits TOOL_CALL, TOOL_RESULT, TEXT_CHUNK and METADATA', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Validate spec-1')] },
      graph,
      'thread-tools-1',
    );
    const types = events.map((e) => e.type);
    expect(types).toContain(AgentEventType.TOOL_CALL);
    expect(types).toContain(AgentEventType.TOOL_RESULT);
    expect(types).toContain(AgentEventType.TEXT_CHUNK);
    expect(types).toContain(AgentEventType.METADATA);
    expect(types).not.toContain(AgentEventType.INTERRUPT);
  });

  it('TOOL_CALL has correct tool name and IN_PROGRESS status', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Validate spec-1')] },
      graph,
      'thread-tools-2',
    );
    const toolCall = events.find((e) => e.type === AgentEventType.TOOL_CALL);
    expect(toolCall?.data.toolName).toBe('api-dev-mcp__validate_spec');
    expect(toolCall?.data.status).toBe('IN_PROGRESS');
  });
});

// ---------------------------------------------------------------------------
// Flow 3 — HITL: graph pauses, user approves
// ---------------------------------------------------------------------------

describe('HITL — approve', () => {
  let graph: any;

  beforeEach(() => {
    const model = createFakeModel([
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'tc-1', name: 'api-dev-mcp__create_openapi_spec', args: { title: 'Todo API' }, type: 'tool_call' }],
      }),
    ]);
    graph = makeTestGraph(model, [fakeCreateSpecTool]).compile({ checkpointer: new MemorySaver() });
  });

  it('first stream ends with an INTERRUPT event', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Design a Todo API')] },
      graph,
      'thread-hitl-approve',
    );
    const types = events.map((e) => e.type);
    expect(types).toContain(AgentEventType.TOOL_CALL);
    expect(types).toContain(AgentEventType.TOOL_RESULT);
    expect(types).toContain(AgentEventType.INTERRUPT);
    expect(types).toContain(AgentEventType.METADATA);
  });

  it('INTERRUPT carries specId and specTitle', async () => {
    const events = await collectEvents(
      { messages: [new HumanMessage('Design a Todo API')] },
      graph,
      'thread-hitl-approve-2',
    );
    const interrupt = events.find((e) => e.type === AgentEventType.INTERRUPT);
    expect(interrupt?.data.specId).toBe('spec-integration-test');
    expect(interrupt?.data.specTitle).toBe('Integration Test API');
  });

  it('resume with approve emits TEXT_CHUNK containing approval message', async () => {
    // First stream — pause at interrupt
    const firstEvents = await collectEvents(
      { messages: [new HumanMessage('Design a Todo API')] },
      graph,
      'thread-hitl-approve-3',
    );
    const interrupt = firstEvents.find((e) => e.type === AgentEventType.INTERRUPT);
    expect(interrupt).toBeDefined();

    // Second stream — resume with approve
    const resumeEvents = await collectEvents(
      new Command({
        resume: {
          interruptId: interrupt!.data.interruptId,
          action: 'approve',
        },
      }),
      graph,
      'thread-hitl-approve-3',
    );

    const types = resumeEvents.map((e) => e.type);
    expect(types).toContain(AgentEventType.TEXT_CHUNK);
    expect(types).toContain(AgentEventType.METADATA);
    expect(types).not.toContain(AgentEventType.INTERRUPT);

    const textChunk = resumeEvents.find((e) => e.type === AgentEventType.TEXT_CHUNK);
    expect(textChunk?.data.content).toContain('approved');
  });
});

// ---------------------------------------------------------------------------
// Flow 4 — HITL: graph pauses, user requests refinement
// ---------------------------------------------------------------------------

describe('HITL — refine', () => {
  let graph: any;

  beforeEach(() => {
    const model = createFakeModel([
      // First call: produce tool call
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'tc-1', name: 'api-dev-mcp__create_openapi_spec', args: { title: 'Todo API' }, type: 'tool_call' }],
      }),
      // Second call (after refine loop-back): plain text response
      new AIMessage('I have refined the spec as requested.'),
    ]);
    graph = makeTestGraph(model, [fakeCreateSpecTool]).compile({ checkpointer: new MemorySaver() });
  });

  it('resume with refine loops back to agent and emits TEXT_CHUNK', async () => {
    // First stream
    const firstEvents = await collectEvents(
      { messages: [new HumanMessage('Design a Todo API')] },
      graph,
      'thread-hitl-refine',
    );
    const interrupt = firstEvents.find((e) => e.type === AgentEventType.INTERRUPT);
    expect(interrupt).toBeDefined();

    // Resume with refine
    const resumeEvents = await collectEvents(
      new Command({
        resume: {
          interruptId: interrupt!.data.interruptId,
          action: 'refine',
          notes: 'Add authentication endpoints',
        },
      }),
      graph,
      'thread-hitl-refine',
    );

    const types = resumeEvents.map((e) => e.type);
    expect(types).toContain(AgentEventType.TEXT_CHUNK);
    expect(types).toContain(AgentEventType.METADATA);
  });
});

// ---------------------------------------------------------------------------
// Flow 5 — HITL: graph pauses, user rejects
// ---------------------------------------------------------------------------

describe('HITL — reject', () => {
  let graph: any;

  beforeEach(() => {
    const model = createFakeModel([
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'tc-1', name: 'api-dev-mcp__create_openapi_spec', args: { title: 'Todo API' }, type: 'tool_call' }],
      }),
    ]);
    graph = makeTestGraph(model, [fakeCreateSpecTool]).compile({ checkpointer: new MemorySaver() });
  });

  it('resume with reject emits TEXT_CHUNK containing discard message', async () => {
    // First stream
    const firstEvents = await collectEvents(
      { messages: [new HumanMessage('Design a Todo API')] },
      graph,
      'thread-hitl-reject',
    );
    const interrupt = firstEvents.find((e) => e.type === AgentEventType.INTERRUPT);
    expect(interrupt).toBeDefined();

    // Resume with reject
    const resumeEvents = await collectEvents(
      new Command({
        resume: {
          interruptId: interrupt!.data.interruptId,
          action: 'reject',
        },
      }),
      graph,
      'thread-hitl-reject',
    );

    const types = resumeEvents.map((e) => e.type);
    expect(types).toContain(AgentEventType.TEXT_CHUNK);
    expect(types).toContain(AgentEventType.METADATA);
    expect(types).not.toContain(AgentEventType.INTERRUPT);

    const textChunk = resumeEvents.find((e) => e.type === AgentEventType.TEXT_CHUNK);
    expect(textChunk?.data.content).toContain('discarded');
  });
});
