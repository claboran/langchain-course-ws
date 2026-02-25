import { Redis } from 'ioredis';
import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  PendingWrite,
  ChannelVersions,
  SerializerProtocol,
} from '@langchain/langgraph-checkpoint';
import { RunnableConfig } from '@langchain/core/runnables';

/**
 * Simple JSON serializer for checkpoints.
 * Internal to RedisCheckpointer — not part of its public API.
 */
class JsonSerializer implements SerializerProtocol {
  async dumpsTyped(obj: any): Promise<[string, Uint8Array]> {
    const jsonString = JSON.stringify(obj);
    return ['json', new TextEncoder().encode(jsonString)];
  }

  async loadsTyped(type: string, data: Uint8Array | string): Promise<any> {
    if (type !== 'json') throw new Error(`Unsupported serialization type: ${type}`);
    const jsonString = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return JSON.parse(jsonString);
  }
}

/**
 * Redis-based checkpoint saver for LangGraph.
 *
 * Key layout:
 *   Checkpoint data : `langgraph:checkpoint:{threadId}:{checkpointId}`
 *   Ordering index  : `langgraph:checkpoint:{threadId}:index`  (sorted set, score = insertion timestamp)
 *   Pending writes  : `langgraph:writes:{threadId}:{checkpointId}:{taskId}`
 *
 * All errors are thrown to the caller — no logging is done here.
 * All key scans use SCAN cursors instead of the blocking KEYS command.
 */
export class RedisCheckpointer extends BaseCheckpointSaver {
  readonly #writesPrefix = 'langgraph:writes:';
  readonly #ttl = 30 * 24 * 60 * 60; // 30 days

  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix = 'langgraph:checkpoint:',
  ) {
    super(new JsonSerializer());
  }

  // ---------------------------------------------------------------------------
  // Key helpers
  // ---------------------------------------------------------------------------

  private checkpointKey(threadId: string, checkpointId: string): string {
    return `${this.keyPrefix}${threadId}:${checkpointId}`;
  }

  private indexKey(threadId: string): string {
    return `${this.keyPrefix}${threadId}:index`;
  }

  private writesKey(threadId: string, checkpointId: string, taskId: string): string {
    return `${this.#writesPrefix}${threadId}:${checkpointId}:${taskId}`;
  }

  // ---------------------------------------------------------------------------
  // SCAN-based key enumeration (non-blocking)
  // ---------------------------------------------------------------------------

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  // ---------------------------------------------------------------------------
  // Serialization helpers
  // ---------------------------------------------------------------------------

  private async deserialize(config: RunnableConfig, raw: string): Promise<CheckpointTuple> {
    const parsed = JSON.parse(raw);
    const checkpointData = Array.isArray(parsed.checkpointData)
      ? new Uint8Array(parsed.checkpointData)
      : parsed.checkpointData;

    const checkpoint = (await this.serde.loadsTyped(
      parsed.checkpointType,
      checkpointData,
    )) as Checkpoint;

    return {
      config,
      checkpoint,
      metadata: parsed.metadata as CheckpointMetadata,
      parentConfig: parsed.parentConfig,
    };
  }

  // ---------------------------------------------------------------------------
  // BaseCheckpointSaver implementation
  // ---------------------------------------------------------------------------

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    // If a specific checkpoint_id was requested, use it directly; otherwise fetch the latest.
    const requestedId: string | undefined = config.configurable?.checkpoint_id;
    const checkpointId = requestedId
      ?? (await this.redis.zrevrange(this.indexKey(threadId), 0, 0))[0];
    if (!checkpointId) return undefined;

    const raw = await this.redis.get(this.checkpointKey(threadId, checkpointId));
    if (!raw) return undefined;

    // Include the resolved checkpoint_id so that downstream operations
    // (putWrites, updateState) receive a fully-qualified config.
    const tupleConfig: RunnableConfig = {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: config.configurable?.checkpoint_ns ?? '',
        checkpoint_id: checkpointId,
      },
    };
    return this.deserialize(tupleConfig, raw);
  }

  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig },
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error('list: thread_id is required in config.configurable');

    let ids = await this.redis.zrevrange(this.indexKey(threadId), 0, -1);
    if (options?.limit) ids = ids.slice(0, options.limit);

    for (const checkpointId of ids) {
      const raw = await this.redis.get(this.checkpointKey(threadId, checkpointId));
      if (raw) {
        // Each yielded tuple must carry its own checkpoint_id in config.
        const tupleConfig: RunnableConfig = {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: config.configurable?.checkpoint_ns ?? '',
            checkpoint_id: checkpointId,
          },
        };
        yield await this.deserialize(tupleConfig, raw);
      }
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error('put: thread_id is required in config.configurable');

    const checkpointId = checkpoint.id || Date.now().toString();
    const key = this.checkpointKey(threadId, checkpointId);
    const idx = this.indexKey(threadId);

    const [checkpointType, checkpointData] = await this.serde.dumpsTyped(checkpoint);

    const payload = JSON.stringify({
      checkpointType,
      checkpointData: Array.from(checkpointData),
      metadata,
      newVersions,
      parentConfig: config.configurable?.checkpoint_id
        ? { configurable: { thread_id: threadId, checkpoint_id: config.configurable.checkpoint_id } }
        : undefined,
    });

    await this.redis
      .pipeline()
      .set(key, payload)
      .expire(key, this.#ttl)
      .zadd(idx, Date.now(), checkpointId)
      .expire(idx, this.#ttl)
      .exec();

    return { configurable: { thread_id: threadId, checkpoint_id: checkpointId } };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;
    if (!threadId || !checkpointId) {
      throw new Error('putWrites: thread_id and checkpoint_id are required in config.configurable');
    }

    const key = this.writesKey(threadId, checkpointId, taskId);
    const payload = JSON.stringify({ writes, taskId, timestamp: new Date().toISOString() });

    await this.redis.pipeline().set(key, payload).expire(key, this.#ttl).exec();
  }

  async deleteThread(threadId: string): Promise<void> {
    const [checkpointKeys, writesKeys] = await Promise.all([
      this.scanKeys(`${this.keyPrefix}${threadId}:*`),
      this.scanKeys(`${this.#writesPrefix}${threadId}:*`),
    ]);

    const allKeys = [...checkpointKeys, ...writesKeys];
    if (allKeys.length > 0) await this.redis.del(...allKeys);
  }

  // ---------------------------------------------------------------------------
  // Extra helpers
  // ---------------------------------------------------------------------------

  async getMessageCount(threadId: string): Promise<number> {
    const tuple = await this.getTuple({ configurable: { thread_id: threadId } });
    if (!tuple) return 0;
    const messages = tuple.checkpoint.channel_values?.['messages'] ?? [];
    return Array.isArray(messages) ? messages.length : 0;
  }
}

