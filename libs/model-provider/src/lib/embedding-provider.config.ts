import { ModuleMetadata } from '@nestjs/common';

export interface EmbeddingProviderConfig {
  baseUrl: string;
  model?: string;
}

export interface EmbeddingProviderAsyncConfig extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<EmbeddingProviderConfig> | EmbeddingProviderConfig;
  inject?: any[];
}
