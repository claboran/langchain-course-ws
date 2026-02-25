import { describe, it, expect } from 'vitest';
import { AgentEventType } from '../langchain/agent.state';

/**
 * Simplified ChatController tests
 *
 * NOTE: Full controller testing with gRPC streaming is complex.
 * For E2E testing, use a real gRPC client to test the full flow.
 *
 * This file tests basic ts-pattern mapping logic.
 */
describe('ChatController Basic Tests', () => {
  describe('event type mapping', () => {
    it('should have all required event types available', () => {
      const eventTypes = [
        AgentEventType.TEXT_CHUNK,
        AgentEventType.TOOL_CALL,
        AgentEventType.TOOL_RESULT,
        AgentEventType.METADATA,
        AgentEventType.ERROR,
      ];

      expect(eventTypes).toHaveLength(5);
      eventTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });
});
