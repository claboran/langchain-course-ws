import Redis from 'ioredis';

/**
 * Redis-backed store for OpenAPI specifications.
 *
 * Key layout:
 *   Spec data   : `mcp:spec:{id}`               (JSON string)
 *   Order index : `mcp:specs:index`              (sorted set, score = insertion timestamp)
 *
 * All operations are async. Call `SpecsStore.initialize(redis)` once at startup
 * before using `SpecsStore.getInstance()`.
 */
export class SpecsStore {
  private static instance: SpecsStore;

  private readonly prefix = 'mcp:spec:';
  private readonly indexKey = 'mcp:specs:index';

  private constructor(private readonly redis: Redis) {}

  static initialize(redis: Redis): SpecsStore {
    SpecsStore.instance = new SpecsStore(redis);
    return SpecsStore.instance;
  }

  static getInstance(): SpecsStore {
    if (!SpecsStore.instance) {
      throw new Error(
        'SpecsStore not initialized. Call SpecsStore.initialize(redis) before use.'
      );
    }
    return SpecsStore.instance;
  }

  async set(id: string, spec: any): Promise<void> {
    await this.redis
      .pipeline()
      .set(`${this.prefix}${id}`, JSON.stringify(spec))
      .zadd(this.indexKey, Date.now(), id)
      .exec();
  }

  async get(id: string): Promise<any | undefined> {
    const raw = await this.redis.get(`${this.prefix}${id}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  async has(id: string): Promise<boolean> {
    return (await this.redis.exists(`${this.prefix}${id}`)) === 1;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.redis
      .pipeline()
      .del(`${this.prefix}${id}`)
      .zrem(this.indexKey, id)
      .exec();
    const deleted = (results?.[0]?.[1] as number) ?? 0;
    return deleted > 0;
  }

  /** Returns specs ordered newest-first */
  async list(): Promise<Array<{ id: string; spec: any }>> {
    const ids = await this.redis.zrevrange(this.indexKey, 0, -1);
    const entries: Array<{ id: string; spec: any }> = [];
    for (const id of ids) {
      const spec = await this.get(id);
      if (spec) entries.push({ id, spec });
    }
    return entries;
  }

  async clear(): Promise<void> {
    const ids = await this.redis.zrange(this.indexKey, 0, -1);
    if (ids.length > 0) {
      const pipeline = this.redis.pipeline();
      ids.forEach((id) => pipeline.del(`${this.prefix}${id}`));
      pipeline.del(this.indexKey);
      await pipeline.exec();
    }
  }

  async getMetadata(
    id: string
  ): Promise<{ title: string; description: string; version: string } | undefined> {
    const spec = await this.get(id);
    if (!spec?.info) return undefined;
    return {
      title: spec.info.title ?? 'Untitled API',
      description: spec.info.description ?? '',
      version: spec.info.version ?? '1.0.0',
    };
  }
}
