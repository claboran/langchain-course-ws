import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  msgType,
  classifyIntent,
  buildSystemPrompt,
  extractSpecId,
  extractSpecTitle,
  extractEndpointCount,
} from './agent.util';

// ---------------------------------------------------------------------------
// msgType
// ---------------------------------------------------------------------------

describe('msgType', () => {
  describe('live LangChain class instances', () => {
    it('returns "human" for HumanMessage', () => {
      expect(msgType(new HumanMessage('hello'))).toBe('human');
    });

    it('returns "ai" for AIMessage', () => {
      expect(msgType(new AIMessage('hi'))).toBe('ai');
    });

    it('returns "tool" for ToolMessage', () => {
      expect(msgType(new ToolMessage({ content: 'result', tool_call_id: 'id1' }))).toBe('tool');
    });
  });

  describe('plain deserialized objects (Redis)', () => {
    it('reads from "type" field', () => {
      expect(msgType({ type: 'human' })).toBe('human');
      expect(msgType({ type: 'ai' })).toBe('ai');
      expect(msgType({ type: 'tool' })).toBe('tool');
    });

    it('falls back to "_type" field when "type" is absent', () => {
      expect(msgType({ _type: 'human' })).toBe('human');
    });

    it('returns "" when neither type field exists', () => {
      expect(msgType({ content: 'hello' })).toBe('');
    });
  });

  describe('edge cases', () => {
    it('returns "" for null', () => {
      expect(msgType(null)).toBe('');
    });

    it('returns "" for undefined', () => {
      expect(msgType(undefined)).toBe('');
    });

    it('returns "" when _getType returns a non-string', () => {
      expect(msgType({ _getType: () => 42 })).toBe('');
    });

    it('prefers _getType() over the plain "type" field', () => {
      // If an object has both, _getType takes precedence
      expect(msgType({ _getType: () => 'ai', type: 'human' })).toBe('ai');
    });
  });
});

// ---------------------------------------------------------------------------
// classifyIntent
// ---------------------------------------------------------------------------

describe('classifyIntent', () => {
  it('classifies api_design for API/spec keywords', () => {
    expect(classifyIntent('Design a REST API for users')).toBe('api_design');
    expect(classifyIntent('create an openapi spec')).toBe('api_design');
    expect(classifyIntent('generate crud endpoints for orders')).toBe('api_design');
    expect(classifyIntent('build a swagger definition')).toBe('api_design');
  });

  it('classifies refinement for modification keywords', () => {
    expect(classifyIntent('Refine the existing spec')).toBe('refinement');
    expect(classifyIntent('update the user endpoint')).toBe('refinement');
    expect(classifyIntent('modify the response schema')).toBe('refinement');
    expect(classifyIntent('remove the deprecated route')).toBe('refinement');
    expect(classifyIntent('adjust the pagination')).toBe('refinement');
  });

  it('refinement takes priority over api_design', () => {
    // "refine" + "api" — refinement wins because it is checked first
    expect(classifyIntent('refine the api spec')).toBe('refinement');
  });

  it('classifies general for unrecognised messages', () => {
    expect(classifyIntent('hello, how are you?')).toBe('general');
    expect(classifyIntent('what time is it?')).toBe('general');
    expect(classifyIntent('')).toBe('general');
  });

  it('recognises "rest" keyword as api_design', () => {
    // "rest" is in the API_DESIGN_RE pattern
    expect(classifyIntent('what is REST?')).toBe('api_design');
  });

  it('is case insensitive', () => {
    expect(classifyIntent('DESIGN AN API')).toBe('api_design');
    expect(classifyIntent('REFINE THE SPEC')).toBe('refinement');
  });
});

// ---------------------------------------------------------------------------
// buildSystemPrompt
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('includes tool names when tools are provided', () => {
    const tools = [{ name: 'create_spec' }, { name: 'add_endpoint' }];
    const prompt = buildSystemPrompt(tools);
    expect(prompt).toContain('create_spec');
    expect(prompt).toContain('add_endpoint');
  });

  it('instructs to use create_openapi_spec proactively when tools are present', () => {
    const prompt = buildSystemPrompt([{ name: 'create_openapi_spec' }]);
    expect(prompt).toContain('create_openapi_spec');
    expect(prompt).toContain('proactively');
  });

  it('omits the tool section when no tools are provided', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).not.toContain('You have access to these tools');
    // Note: "proactively" still appears in the fixed Guidelines section
  });

  it('always includes the core role description', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('API development');
    expect(prompt).toContain('OpenAPI');
    expect(prompt).toContain('REST');
  });
});

// ---------------------------------------------------------------------------
// extractSpecId
// ---------------------------------------------------------------------------

describe('extractSpecId', () => {
  it('extracts specId from valid JSON', () => {
    const content = JSON.stringify({ specId: 'spec-123', message: 'Created' });
    expect(extractSpecId(content)).toBe('spec-123');
  });

  it('returns null when specId key is absent', () => {
    const content = JSON.stringify({ message: 'Created' });
    expect(extractSpecId(content)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(extractSpecId('not-json')).toBeNull();
    expect(extractSpecId('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractSpecTitle
// ---------------------------------------------------------------------------

describe('extractSpecTitle', () => {
  it('extracts from summary.title (MCP tool response shape)', () => {
    const content = JSON.stringify({ summary: { title: 'Todo API' } });
    expect(extractSpecTitle(content)).toBe('Todo API');
  });

  it('falls back to top-level title', () => {
    const content = JSON.stringify({ title: 'Todo API' });
    expect(extractSpecTitle(content)).toBe('Todo API');
  });

  it('returns "Generated API" when no title field exists', () => {
    expect(extractSpecTitle(JSON.stringify({ specId: 'spec-1' }))).toBe('Generated API');
  });

  it('returns "Generated API" for invalid JSON', () => {
    expect(extractSpecTitle('bad-json')).toBe('Generated API');
    expect(extractSpecTitle('')).toBe('Generated API');
  });
});

// ---------------------------------------------------------------------------
// extractEndpointCount
// ---------------------------------------------------------------------------

describe('extractEndpointCount', () => {
  it('extracts from summary.endpoints (MCP tool response shape)', () => {
    const content = JSON.stringify({ summary: { endpoints: 6 } });
    expect(extractEndpointCount(content)).toBe(6);
  });

  it('falls back to totalEndpoints', () => {
    const content = JSON.stringify({ totalEndpoints: 4 });
    expect(extractEndpointCount(content)).toBe(4);
  });

  it('returns 0 when no count field exists', () => {
    expect(extractEndpointCount(JSON.stringify({ specId: 'spec-1' }))).toBe(0);
  });

  it('returns 0 for invalid JSON', () => {
    expect(extractEndpointCount('bad-json')).toBe(0);
    expect(extractEndpointCount('')).toBe(0);
  });
});
