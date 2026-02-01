import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { PoolConfig } from 'pg';
import { OLLAMA_EMBEDDINGS } from '@langchain-course-ws/model-provider';

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private vectorStore: PGVectorStore | null = null;
  readonly #logger = new Logger(VectorStoreService.name);

  constructor(
    @Inject(OLLAMA_EMBEDDINGS) private readonly embeddings: OllamaEmbeddings,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.#logger.log('Initializing VectorStore connection pool...');
    await this.initializeVectorStore();
    this.#logger.log('VectorStore ready');
  }

  async onModuleDestroy() {
    this.#logger.log('Closing VectorStore connection pool...');
    await this.close();
  }

  async getVectorStore(): Promise<PGVectorStore> {
    if (!this.vectorStore) {
      await this.initializeVectorStore();
    }
    return this.vectorStore!;
  }

  private async initializeVectorStore(): Promise<void> {
    const pgConfig = this.getPgConfig();

    this.#logger.debug(`Connecting to database: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
    this.#logger.debug(`Table: product_embeddings, Embedding model: nomic-embed-text`);

    try {
      this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
        postgresConnectionOptions: pgConfig,
        tableName: 'product_embeddings',
        columns: {
          contentColumnName: 'content',
          vectorColumnName: 'embedding',
          metadataColumnName: 'metadata',
        },
      });
      this.#logger.debug('VectorStore initialized successfully');
    } catch (error) {
      this.#logger.error(`Failed to initialize VectorStore: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async close(): Promise<void> {
    if (this.vectorStore) {
      await this.vectorStore.end();
      this.vectorStore = null;
    }
  }

  private getPgConfig(): PoolConfig {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const url = new URL(databaseUrl);

    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }
}
