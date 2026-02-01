import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { EmbeddingProviderModule } from '@langchain-course-ws/model-provider';
import { IngestModule } from '../ingest/ingest.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { winstonConfig } from '../config/winston.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(winstonConfig),
    EmbeddingProviderModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseUrl: configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11435',
        model: 'nomic-embed-text',
      }),
      inject: [ConfigService],
    }),
    VectorStoreModule,
    IngestModule,
  ],
  providers: [],
})
export class AppModule {}
