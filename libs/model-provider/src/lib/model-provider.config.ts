import { ModuleMetadata } from '@nestjs/common';

export interface ModelProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface ModelProviderAsyncConfig extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ModelProviderConfig> | ModelProviderConfig;
  inject?: any[];
}
