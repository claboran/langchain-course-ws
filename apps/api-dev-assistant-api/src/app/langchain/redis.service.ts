import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Owns the Redis connection lifecycle.
 * All other services that need Redis should inject this and call getClient().
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly #logger = new Logger(RedisService.name);
  #client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.#logger.log(`Connecting to Redis at ${url}`);

    this.#client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.#client.on('connect', () => this.#logger.log('Connected to Redis'));
    this.#client.on('ready',   () => this.#logger.log('Redis client is ready'));
    this.#client.on('error',   (err) => this.#logger.error('Redis connection error', err));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.#client) {
      this.#logger.log('Disconnecting from Redis');
      await this.#client.quit();
    }
  }

  getClient(): Redis {
    if (!this.#client) throw new Error('Redis client not initialised');
    return this.#client;
  }

  isConnected(): boolean {
    return this.#client?.status === 'ready';
  }
}
