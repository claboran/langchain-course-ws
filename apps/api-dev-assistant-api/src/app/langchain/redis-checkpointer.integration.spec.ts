import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { RedisCheckpointer } from './redis-checkpointer';

describe('RedisCheckpointer Integration Tests', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let checkpointer: RedisCheckpointer;

  beforeAll(async () => {
    // Start Redis container with specific image
    container = await new RedisContainer('redis:7-alpine').start();

    // Connect to the container
    redis = new Redis({
      host: container.getHost(),
      port: container.getPort(),
    });

    checkpointer = new RedisCheckpointer(redis);
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  describe('checkpoint lifecycle', () => {
    it('should save and retrieve checkpoint', async () => {
      const threadId = 'test-thread-1';
      const checkpoint = {
        id: '123',
        channel_values: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      // Save checkpoint
      const savedConfig = await checkpointer.put(
        { configurable: { thread_id: threadId } },
        checkpoint as any,
        { source: 'input', step: 1 } as any,
        {}
      );

      expect(savedConfig).toBeDefined();
      expect(savedConfig.configurable?.thread_id).toBe(threadId);

      // Retrieve checkpoint
      const retrieved = await checkpointer.getTuple({
        configurable: { thread_id: threadId },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.checkpoint.id).toBe('123');
      expect(retrieved?.metadata?.step).toBe(1);
    });

    it('should handle multiple checkpoints and return latest', async () => {
      const threadId = 'test-thread-2';

      // Save first checkpoint
      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'checkpoint-1', channel_values: {} } as any,
        { source: 'loop', step: 1 } as any,
        {}
      );

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Save second checkpoint
      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'checkpoint-2', channel_values: {} } as any,
        { source: 'loop', step: 2 } as any,
        {}
      );

      // Should retrieve the latest (checkpoint-2)
      const retrieved = await checkpointer.getTuple({
        configurable: { thread_id: threadId },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.checkpoint.id).toBe('checkpoint-2');
      expect(retrieved?.metadata?.step).toBe(2);
    });

    it('should list all checkpoints for a thread', async () => {
      const threadId = 'test-thread-3';

      // Save multiple checkpoints
      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'cp-1', channel_values: {} } as any,
        { source: 'loop', step: 1 } as any,
        {}
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'cp-2', channel_values: {} } as any,
        { source: 'loop', step: 2 } as any,
        {}
      );

      // List all checkpoints
      const checkpoints: any[] = [];
      for await (const tuple of checkpointer.list({
        configurable: { thread_id: threadId },
      })) {
        checkpoints.push(tuple);
      }

      expect(checkpoints.length).toBe(2);
      // Should be in descending order (newest first)
      expect(checkpoints[0].checkpoint.id).toBe('cp-2');
      expect(checkpoints[1].checkpoint.id).toBe('cp-1');
    });

    it('should list with limit', async () => {
      const threadId = 'test-thread-4';

      // Save 3 checkpoints
      for (let i = 1; i <= 3; i++) {
        await checkpointer.put(
          { configurable: { thread_id: threadId } },
          { id: `cp-${i}`, channel_values: {} } as any,
          { source: 'loop', step: i } as any,
          {}
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // List with limit of 2
      const checkpoints: any[] = [];
      for await (const tuple of checkpointer.list(
        { configurable: { thread_id: threadId } },
        { limit: 2 }
      )) {
        checkpoints.push(tuple);
      }

      expect(checkpoints.length).toBe(2);
    });
  });

  describe('thread deletion', () => {
    it('should delete all checkpoints for a thread', async () => {
      const threadId = 'test-thread-delete';

      // Save checkpoints
      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'cp-1', channel_values: {} } as any,
        { source: 'loop', step: 1 } as any,
        {}
      );

      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        { id: 'cp-2', channel_values: {} } as any,
        { source: 'loop', step: 2 } as any,
        {}
      );

      // Verify checkpoints exist
      const beforeDelete = await checkpointer.getTuple({
        configurable: { thread_id: threadId },
      });
      expect(beforeDelete).toBeDefined();

      // Delete thread
      await checkpointer.deleteThread(threadId);

      // Verify checkpoints are deleted
      const afterDelete = await checkpointer.getTuple({
        configurable: { thread_id: threadId },
      });
      expect(afterDelete).toBeUndefined();
    });

    it('should handle deletion of non-existent thread', async () => {
      await expect(
        checkpointer.deleteThread('non-existent-thread')
      ).resolves.not.toThrow();
    });
  });

  describe('message count', () => {
    it('should return correct message count', async () => {
      const threadId = 'test-thread-count';

      const checkpoint = {
        id: '123',
        channel_values: {
          messages: [
            { role: 'user', content: 'Message 1' },
            { role: 'assistant', content: 'Message 2' },
            { role: 'user', content: 'Message 3' },
          ],
        },
      };

      await checkpointer.put(
        { configurable: { thread_id: threadId } },
        checkpoint as any,
        { source: 'loop', step: 1 } as any,
        {}
      );

      const count = await checkpointer.getMessageCount(threadId);
      expect(count).toBe(3);
    });

    it('should return 0 for thread with no checkpoints', async () => {
      const count = await checkpointer.getMessageCount('non-existent-thread');
      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing thread_id gracefully', async () => {
      const result = await checkpointer.getTuple({});
      expect(result).toBeUndefined();
    });

    it('should throw error when saving without thread_id', async () => {
      await expect(
        checkpointer.put({}, { id: '123' } as any, { source: 'loop' } as any, {})
      ).rejects.toThrow('thread_id is required');
    });
  });
});
