import { describe, it, expect } from 'vitest';
import { AgentEventType } from './agent.state';

/**
 * Simplified AgentService tests
 *
 * NOTE: Full agent testing should use:
 * 1. LangChain's FakeListChatModel (see agent.service.improved.spec.ts)
 * 2. Integration tests with real Redis (see redis.service.integration.spec.ts)
 *
 * This file only tests basic types and enums.
 */
describe('AgentService Basic Tests', () => {
  describe('event types', () => {
    it('should have correct event type enum values', () => {
      expect(AgentEventType.TEXT_CHUNK).toBe('text_chunk');
      expect(AgentEventType.TOOL_CALL).toBe('tool_call');
      expect(AgentEventType.TOOL_RESULT).toBe('tool_result');
      expect(AgentEventType.METADATA).toBe('metadata');
      expect(AgentEventType.ERROR).toBe('error');
    });

    it('should export all required event types', () => {
      const eventTypes = Object.values(AgentEventType);
      expect(eventTypes).toContain('text_chunk');
      expect(eventTypes).toContain('tool_call');
      expect(eventTypes).toContain('tool_result');
      expect(eventTypes).toContain('metadata');
      expect(eventTypes).toContain('error');
    });
  });
});
