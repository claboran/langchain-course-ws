import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModelProviderModule, EmbeddingProviderModule } from '@langchain-course-ws/model-provider';
import { EcommerceAssistantModule } from '../ecommerce-assistant/ecommerce-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ModelProviderModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        apiKey: configService.get<string>('MISTRAL_API_KEY') || '',
        model: 'mistral-large-latest',
        temperature: 0.7,
      }),
      inject: [ConfigService],
    }),
    EmbeddingProviderModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseUrl: configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434',
        model: 'nomic-embed-text',
      }),
      inject: [ConfigService],
    }),
    EcommerceAssistantModule,
  ],
})
export class AppModule {}
