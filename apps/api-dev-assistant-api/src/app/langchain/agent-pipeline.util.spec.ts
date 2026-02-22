import { describe, it, expect, beforeEach } from 'vitest';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  makeStreamProcessingState,
  processStateSnapshot,
  metadataEvent,
  errorEvent,
} from './agent-pipeline.util';
import { AgentEventType, StreamProcessingState } from './agent.state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseState = { messages: [], intent: null, activeSpecId: null } as any;
const stateWith = (overrides: Record<string, unknown>) => ({ ...baseState, ...overrides });

let shared: StreamProcessingState;

beforeEach(() => {
  shared = makeStreamProcessingState();
});

// ---------------------------------------------------------------------------
// makeStreamProcessingState
// ---------------------------------------------------------------------------

describe('makeStreamProcessingState', () => {
  it('initialises with correct defaults', () => {
    expect(shared.sequence).toBe(0);
    expect(shared.hasToolCalls).toBe(false);
    expect(shared.promptTokens).toBe(0);
    expect(shared.completionTokens).toBe(0);
    expect(shared.processedIds).toBeInstanceOf(Set);
    expect(shared.processedIds.size).toBe(0);
    expect(shared.interruptEmitted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — interrupt path
// ---------------------------------------------------------------------------

describe('processStateSnapshot — interrupt path', () => {
  it('emits an INTERRUPT event and sets interruptEmitted', () => {
    const state = stateWith({
      __interrupt__: [
        {
          value: {
            interruptId: 'int-1',
            specId: 'spec-1',
            specTitle: 'Test API',
            endpointCount: 3,
          },
        },
      ],
    });

    const events = processStateSnapshot(state, shared);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(AgentEventType.INTERRUPT);
    expect(events[0].data.interruptId).toBe('int-1');
    expect(events[0].data.specId).toBe('spec-1');
    expect(events[0].sequence).toBe(0);
    expect(shared.interruptEmitted).toBe(true);
    expect(shared.sequence).toBe(1);
  });

  it('skips interrupt values with missing interruptId', () => {
    const state = stateWith({
      __interrupt__: [{ value: { specId: 'spec-1' } }], // no interruptId
    });
    const events = processStateSnapshot(state, shared);
    expect(events).toEqual([]);
  });

  it('returns [] for empty __interrupt__ array', () => {
    const state = stateWith({ __interrupt__: [] });
    // eventsFromInterrupts returns null for empty array → falls through to message processing
    // but messages is empty → returns []
    const events = processStateSnapshot(state, shared);
    expect(events).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — AI message path
// ---------------------------------------------------------------------------

describe('processStateSnapshot — AI message path', () => {
  it('emits a TEXT_CHUNK event for an AIMessage with text content', () => {
    const msg = new AIMessage({ content: 'Here is your API design', id: 'msg-1' });
    const state = stateWith({ messages: [msg] });

    const events = processStateSnapshot(state, shared);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(AgentEventType.TEXT_CHUNK);
    expect(events[0].data.content).toBe('Here is your API design');
    expect(events[0].data.role).toBe('assistant');
    expect(events[0].sequence).toBe(0);
    expect(events[0].isFinal).toBe(false);
  });

  it('accumulates token usage from usage_metadata', () => {
    const msg = new AIMessage({
      content: 'Answer',
      id: 'msg-2',
      usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    } as any);
    const state = stateWith({ messages: [msg] });

    processStateSnapshot(state, shared);

    expect(shared.promptTokens).toBe(10);
    expect(shared.completionTokens).toBe(5);
  });

  it('emits no TEXT_CHUNK for an AIMessage with empty content', () => {
    const msg = new AIMessage({
      content: '',
      id: 'msg-3',
      tool_calls: [{ id: 'c1', name: 'some_tool', args: {}, type: 'tool_call' }],
    });
    const state = stateWith({ messages: [msg] });

    const events = processStateSnapshot(state, shared);
    // Only TOOL_CALL, no TEXT_CHUNK
    expect(events.every((e) => e.type !== AgentEventType.TEXT_CHUNK)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — tool_calls path
// ---------------------------------------------------------------------------

describe('processStateSnapshot — tool_calls path', () => {
  it('emits a TOOL_CALL event for each tool call in the last AIMessage', () => {
    const msg = new AIMessage({
      content: '',
      id: 'msg-tc',
      tool_calls: [
        { id: 'c1', name: 'create_spec', args: { title: 'API' }, type: 'tool_call' },
        { id: 'c2', name: 'add_endpoint', args: { path: '/users' }, type: 'tool_call' },
      ],
    });
    const state = stateWith({ messages: [msg] });

    const events = processStateSnapshot(state, shared);

    const toolCallEvents = events.filter((e) => e.type === AgentEventType.TOOL_CALL);
    expect(toolCallEvents).toHaveLength(2);
    expect(toolCallEvents[0].data.toolName).toBe('create_spec');
    expect(toolCallEvents[0].data.arguments).toBe(JSON.stringify({ title: 'API' }));
    expect(toolCallEvents[0].data.status).toBe('IN_PROGRESS');
    expect(toolCallEvents[1].data.toolName).toBe('add_endpoint');
    expect(shared.hasToolCalls).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — tool result path
// ---------------------------------------------------------------------------

describe('processStateSnapshot — tool result path', () => {
  it('emits a TOOL_RESULT event for a ToolMessage', () => {
    const msg = new ToolMessage({
      content: '{"specId":"spec-1"}',
      tool_call_id: 'c1',
      name: 'create_spec',
      id: 'tm-1',
    } as any);
    const state = stateWith({ messages: [msg] });

    const events = processStateSnapshot(state, shared);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(AgentEventType.TOOL_RESULT);
    expect(events[0].data.toolName).toBe('create_spec');
    expect(events[0].data.result).toBe('{"specId":"spec-1"}');
    expect(events[0].data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — deduplication
// ---------------------------------------------------------------------------

describe('processStateSnapshot — deduplication', () => {
  it('skips a message whose id was already processed', () => {
    const msg = new AIMessage({ content: 'Hello', id: 'dup-1' });
    const state = stateWith({ messages: [msg] });

    // First call — processed
    const first = processStateSnapshot(state, shared);
    expect(first).toHaveLength(1);

    // Second call with same state (same message id) — deduplicated
    const second = processStateSnapshot(state, shared);
    expect(second).toHaveLength(0);
  });

  it('processes messages without id every time (no id to track)', () => {
    // Messages without id won't be tracked in processedIds
    const msg = new AIMessage('No id message');
    // Remove any auto-assigned id
    (msg as any).id = undefined;
    const state = stateWith({ messages: [msg] });

    const first = processStateSnapshot(state, shared);
    const second = processStateSnapshot(state, shared);
    // Both calls produce events because there is no id to deduplicate on
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// processStateSnapshot — empty / plain-object guard
// ---------------------------------------------------------------------------

describe('processStateSnapshot — guards', () => {
  it('returns [] for an empty messages array', () => {
    expect(processStateSnapshot(stateWith({ messages: [] }), shared)).toEqual([]);
  });

  it('returns [] when the last message is a plain object (no _getType method)', () => {
    const state = stateWith({ messages: [{ type: 'ai', content: 'hello' }] });
    expect(processStateSnapshot(state, shared)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// metadataEvent
// ---------------------------------------------------------------------------

describe('metadataEvent', () => {
  it('returns a METADATA event with isFinal: true', () => {
    shared.hasToolCalls = true;
    shared.promptTokens = 100;
    shared.completionTokens = 50;
    shared.sequence = 3;

    const event = metadataEvent('conv-1', 5, 'mistral-large', shared);

    expect(event.type).toBe(AgentEventType.METADATA);
    expect(event.isFinal).toBe(true);
    expect(event.sequence).toBe(3);
    expect(event.data.conversationId).toBe('conv-1');
    expect(event.data.messageCount).toBe(5);
    expect(event.data.model).toBe('mistral-large');
    expect(event.data.hasToolCalls).toBe(true);
    expect(event.data.tokenUsage.promptTokens).toBe(100);
    expect(event.data.tokenUsage.completionTokens).toBe(50);
    expect(event.data.tokenUsage.totalTokens).toBe(150);
    expect(shared.sequence).toBe(4); // incremented
  });
});

// ---------------------------------------------------------------------------
// errorEvent
// ---------------------------------------------------------------------------

describe('errorEvent', () => {
  it('returns an ERROR event with isFinal: true', () => {
    const err = new Error('Something went wrong');
    const event = errorEvent(err, shared);

    expect(event.type).toBe(AgentEventType.ERROR);
    expect(event.isFinal).toBe(true);
    expect(event.data.code).toBe('AGENT_ERROR');
    expect(event.data.message).toBe('Something went wrong');
    expect(event.data.retryable).toBe(false);
    expect(shared.sequence).toBe(1);
  });

  it('uses a fallback message when error has no message', () => {
    const event = errorEvent({}, shared);
    expect(event.data.message).toBe('An error occurred while processing your request');
  });
});
