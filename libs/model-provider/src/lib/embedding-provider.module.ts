import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EmbeddingProviderAsyncConfig, EmbeddingProviderConfig } from './embedding-provider.config';
import { EMBEDDING_PROVIDER_CONFIG, OLLAMA_EMBEDDINGS } from './embedding-provider.constants';
import { createOllamaEmbeddings } from './embedding-provider.factory';

@Module({})
export class EmbeddingProviderModule {
  static forRootAsync(options: EmbeddingProviderAsyncConfig): DynamicModule {
    const configProvider: Provider = {
      provide: EMBEDDING_PROVIDER_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const ollamaEmbeddingsProvider: Provider = {
      provide: OLLAMA_EMBEDDINGS,
      useFactory: (config: EmbeddingProviderConfig) => createOllamaEmbeddings(config),
      inject: [EMBEDDING_PROVIDER_CONFIG],
    };

    return {
      module: EmbeddingProviderModule,
      imports: options.imports || [],
      providers: [configProvider, ollamaEmbeddingsProvider],
      exports: [OLLAMA_EMBEDDINGS],
      global: true,
    };
  }
}
