import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatCommand } from './chat.command';

@Module({
  providers: [ChatService, ChatCommand],
  exports: [ChatService, ChatCommand],
})
export class ChatModule {}
