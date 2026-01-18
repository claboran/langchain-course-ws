import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ModelProviderAsyncConfig, ModelProviderConfig } from './model-provider.config';
import { CHAT_MISTRAL_AI, MODEL_PROVIDER_CONFIG } from './model-provider.constants';
import { createChatMistralAI } from './model-provider.factory';

@Module({})
export class ModelProviderModule {
  static forRootAsync(options: ModelProviderAsyncConfig): DynamicModule {
    const configProvider: Provider = {
      provide: MODEL_PROVIDER_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const chatMistralAIProvider: Provider = {
      provide: CHAT_MISTRAL_AI,
      useFactory: (config: ModelProviderConfig) => createChatMistralAI(config),
      inject: [MODEL_PROVIDER_CONFIG],
    };

    return {
      module: ModelProviderModule,
      imports: options.imports || [],
      providers: [configProvider, chatMistralAIProvider],
      exports: [CHAT_MISTRAL_AI],
      global: true,
    };
  }
}
