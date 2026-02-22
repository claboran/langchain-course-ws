import { describe, it, expect } from 'vitest';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { END } from '@langchain/langgraph';
import {
  shouldContinue,
  shouldAfterTools,
  afterHumanReview,
  buildInterruptEvent,
  makeClassifyNode,
  makeAfterToolsNode,
} from './agent-graph.util';
import { AgentEventType } from './agent.state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseState = { messages: [], intent: null, activeSpecId: null } as any;

const stateWith = (overrides: Record<string, unknown>) => ({ ...baseState, ...overrides });

// ---------------------------------------------------------------------------
// shouldContinue
// ---------------------------------------------------------------------------

describe('shouldContinue', () => {
  it('routes to "tools" when the last message has tool_calls', () => {
    const state = stateWith({
      messages: [
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'call_1', name: 'some_tool', args: {}, type: 'tool_call' }],
        }),
      ],
    });
    expect(shouldContinue(state)).toBe('tools');
  });

  it('routes to END when the last message has no tool_calls', () => {
    const state = stateWith({ messages: [new AIMessage('Final answer')] });
    expect(shouldContinue(state)).toBe(END);
  });

  it('routes to END when tool_calls is an empty array', () => {
    const state = stateWith({
      messages: [new AIMessage({ content: '', tool_calls: [] })],
    });
    expect(shouldContinue(state)).toBe(END);
  });

  it('routes to END when messages array is empty', () => {
    expect(shouldContinue(stateWith({ messages: [] }))).toBe(END);
  });
});

// ---------------------------------------------------------------------------
// shouldAfterTools
// ---------------------------------------------------------------------------

describe('shouldAfterTools', () => {
  it('routes to "human_review" when activeSpecId is set', () => {
    const state = stateWith({ activeSpecId: 'spec-abc' });
    expect(shouldAfterTools(state)).toBe('human_review');
  });

  it('routes to "agent" when activeSpecId is null', () => {
    const state = stateWith({ activeSpecId: null });
    expect(shouldAfterTools(state)).toBe('agent');
  });
});

// ---------------------------------------------------------------------------
// afterHumanReview
// ---------------------------------------------------------------------------

describe('afterHumanReview', () => {
  it('routes to "agent" when the last message is a HumanMessage (refine loop)', () => {
    const state = stateWith({ messages: [new HumanMessage('Please refine')] });
    expect(afterHumanReview(state)).toBe('agent');
  });

  it('routes to END when the last message is an AIMessage (approve/reject)', () => {
    const state = stateWith({ messages: [new AIMessage('✅ Approved!')] });
    expect(afterHumanReview(state)).toBe(END);
  });

  it('routes to "agent" for a plain deserialized human message (Redis round-trip)', () => {
    const state = stateWith({ messages: [{ type: 'human', content: 'refine it' }] });
    expect(afterHumanReview(state)).toBe('agent');
  });
});

// ---------------------------------------------------------------------------
// buildInterruptEvent
// ---------------------------------------------------------------------------

describe('buildInterruptEvent', () => {
  const validInterrupt = {
    interruptId: 'int-123',
    specId: 'spec-456',
    specTitle: 'Todo API',
    endpointCount: 6,
  };

  it('returns an INTERRUPT AgentEvent for a valid HitlInterrupt', () => {
    const event = buildInterruptEvent(validInterrupt, 2);
    expect(event).not.toBeNull();
    expect(event!.type).toBe(AgentEventType.INTERRUPT);
    expect(event!.sequence).toBe(2);
    expect(event!.isFinal).toBe(false);
    expect(event!.data.interruptId).toBe('int-123');
    expect(event!.data.specId).toBe('spec-456');
    expect(event!.data.specTitle).toBe('Todo API');
    expect(event!.data.endpointCount).toBe(6);
    expect(typeof event!.data.message).toBe('string');
  });

  it('returns null when interruptId is missing', () => {
    expect(buildInterruptEvent({ specId: 'spec-1', specTitle: 'API', endpointCount: 0 } as any, 0)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(buildInterruptEvent(null as any, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// makeClassifyNode
// ---------------------------------------------------------------------------

describe('makeClassifyNode', () => {
  const classify = makeClassifyNode();

  it('returns api_design for API design messages', async () => {
    const state = stateWith({ messages: [new HumanMessage('Design a REST API for a todo app')] });
    const result = await classify(state);
    expect(result.intent).toBe('api_design');
  });

  it('returns refinement for refinement messages', async () => {
    const state = stateWith({ messages: [new HumanMessage('Refine the user endpoint')] });
    const result = await classify(state);
    expect(result.intent).toBe('refinement');
  });

  it('returns general for unrelated messages', async () => {
    const state = stateWith({ messages: [new HumanMessage('Hello, how are you?')] });
    const result = await classify(state);
    expect(result.intent).toBe('general');
  });

  it('returns general when messages array is empty', async () => {
    const result = await classify(stateWith({ messages: [] }));
    expect(result.intent).toBe('general');
  });

  it('classifies using the last human message in history', async () => {
    // AI message is last but human message before it determines intent
    const state = stateWith({
      messages: [
        new HumanMessage('Design an API for todos'),
        new AIMessage('Sure, let me create it'),
      ],
    });
    const result = await classify(state);
    // Searches backwards for the last HumanMessage
    expect(result.intent).toBe('api_design');
  });
});

// ---------------------------------------------------------------------------
// makeAfterToolsNode
// ---------------------------------------------------------------------------

describe('makeAfterToolsNode', () => {
  const afterTools = makeAfterToolsNode();

  const specToolMsg = new ToolMessage({
    content: JSON.stringify({ specId: 'spec-new-123', summary: { title: 'My API', endpoints: 4 } }),
    tool_call_id: 'call_1',
    name: 'api-dev-mcp__create_openapi_spec',
  });

  const addEndpointToolMsg = new ToolMessage({
    content: JSON.stringify({ specId: 'spec-existing', summary: { title: 'My API', endpoints: 5 } }),
    tool_call_id: 'call_2',
    name: 'api-dev-mcp__add_endpoint',
  });

  const genericToolMsg = new ToolMessage({
    content: JSON.stringify({ result: 'done' }),
    tool_call_id: 'call_3',
    name: 'api-dev-mcp__validate_spec',
  });

  it('sets activeSpecId from a create_openapi_spec tool result', async () => {
    const state = stateWith({ messages: [specToolMsg] });
    const result = await afterTools(state);
    expect(result.activeSpecId).toBe('spec-new-123');
  });

  it('sets activeSpecId from an add_endpoint tool result', async () => {
    const state = stateWith({ messages: [addEndpointToolMsg] });
    const result = await afterTools(state);
    expect(result.activeSpecId).toBe('spec-existing');
  });

  it('returns {} for non-spec-modifying tools', async () => {
    const state = stateWith({ messages: [genericToolMsg] });
    const result = await afterTools(state);
    expect(result).toEqual({});
  });

  it('returns {} when no tool messages exist in state', async () => {
    const state = stateWith({ messages: [new HumanMessage('hello')] });
    const result = await afterTools(state);
    expect(result).toEqual({});
  });

  it('uses the last tool message when multiple are present', async () => {
    const state = stateWith({ messages: [specToolMsg, addEndpointToolMsg] });
    const result = await afterTools(state);
    expect(result.activeSpecId).toBe('spec-existing');
  });
});
