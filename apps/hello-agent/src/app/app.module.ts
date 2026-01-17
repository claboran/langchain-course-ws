import { Module } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { ChatCommand } from '../chat/chat.command';

@Module({
  providers: [ChatService, ChatCommand],
})
export class AppModule {}
