import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModelProviderModule } from '@langchain-course-ws/model-provider';
import { ChatService } from '../chat/chat.service';
import { ChatCommand } from '../chat/chat.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ModelProviderModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get<string>('MISTRAL_API_KEY') || '',
        model: 'mistral-large-latest',
        temperature: 0.2,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatService, ChatCommand],
})
export class AppModule {}
