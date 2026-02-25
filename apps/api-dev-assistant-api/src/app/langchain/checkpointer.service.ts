import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisCheckpointer } from './redis-checkpointer';
import { RedisService } from './redis.service';

/**
 * Owns the LangGraph checkpointer and all checkpoint-level operations.
 *
 * AgentService injects this instead of RedisService so the two concerns
 * stay separate:
 *   RedisService      — connection lifecycle (ioredis)
 *   CheckpointerService — LangGraph state persistence (BaseCheckpointSaver)
 */
@Injectable()
export class CheckpointerService implements OnModuleInit {
  readonly #logger = new Logger(CheckpointerService.name);
  #checkpointer: RedisCheckpointer;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit(): void {
    this.#checkpointer = new RedisCheckpointer(this.redisService.getClient());
    this.#logger.log('RedisCheckpointer initialised');
  }

  /**
   * Returns the checkpointer to pass into StateGraph.compile().
   */
  getCheckpointer(): RedisCheckpointer {
    return this.#checkpointer;
  }

  /**
   * Number of messages stored in the latest checkpoint for a conversation.
   */
  getMessageCount(conversationId: string): Promise<number> {
    return this.#checkpointer.getMessageCount(conversationId);
  }

  /**
   * Delete all checkpoints and pending writes for a conversation.
   * Returns the message count that existed before deletion.
   */
  async deleteConversation(conversationId: string): Promise<number> {
    try {
      const messageCount = await this.#checkpointer.getMessageCount(conversationId);
      await this.#checkpointer.deleteThread(conversationId);
      this.#logger.log(`Deleted conversation ${conversationId} (${messageCount} messages)`);
      return messageCount;
    } catch (error) {
      this.#logger.error(`Error deleting conversation ${conversationId}`, error);
      throw error;
    }
  }
}

