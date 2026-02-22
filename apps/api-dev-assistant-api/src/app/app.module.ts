import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModelProviderModule } from '@langchain-course-ws/model-provider';
import { ChatController } from './chat/chat.controller';
import { MCPClientService } from './mcp/mcp-client.service';
import { RedisService } from './langchain/redis.service';
import { CheckpointerService } from './langchain/checkpointer.service';
import { AgentService } from './langchain/agent.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      expandVariables: true,
    }),
    ModelProviderModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        apiKey: configService.get<string>('MISTRAL_API_KEY') || '',
        model: configService.get<string>('MODEL_NAME', 'mistral-large-latest'),
        temperature: parseFloat(configService.get<string>('MODEL_TEMPERATURE', '0.7')),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [MCPClientService, RedisService, CheckpointerService, AgentService],
})
export class AppModule {}
