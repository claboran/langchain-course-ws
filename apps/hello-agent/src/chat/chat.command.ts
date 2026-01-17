import { Command, CommandRunner, Option } from 'nest-commander';
import { ChatService } from './chat.service';

interface ChatCommandOptions {
  message?: string;
}

@Command({
  name: 'chat',
  description: 'Chat with the AI agent',
})
export class ChatCommand extends CommandRunner {
  constructor(private readonly chatService: ChatService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: ChatCommandOptions,
  ): Promise<void> {
    const message = passedParams.join(' ') || 'Hello!';
    const response = await this.chatService.chat(message);
    console.log(response);
  }
}
