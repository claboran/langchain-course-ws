import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMemoryService } from './chat-memory.service';
import { AgentService } from './agent.service';
import { UserContextService } from './user-context.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatMemoryService, AgentService, UserContextService],
})
export class ChatModule {}
