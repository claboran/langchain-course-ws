import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { ChatCommand } from '../chat/chat.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [ChatService, ChatCommand],
})
export class AppModule {}
