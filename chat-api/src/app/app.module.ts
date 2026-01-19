import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModelProviderModule } from '@langchain-course-ws/model-provider';
import { ChatModule } from '../chat/chat.module';

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
    ChatModule,
  ],
})
export class AppModule {}
