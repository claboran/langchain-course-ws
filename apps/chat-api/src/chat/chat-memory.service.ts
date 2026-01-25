import { Injectable, Logger } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph';
import { UserContextService } from './user-context.service';

@Injectable()
export class ChatMemoryService {
  readonly #checkPointer = new MemorySaver();
  readonly #logger = new Logger(ChatMemoryService.name);

  constructor(private readonly userContextService: UserContextService) {}

  get checkPointer() {
    return this.#checkPointer;
  }


  async deleteConversation(conversationId: string): Promise<void> {
    this.#logger.log(`Deleting conversation ${conversationId}`);

    // Delete the conversation from memory using conversationId as thread_id
    await this.#checkPointer.deleteThread(conversationId);

    // Also clean up user context
    this.userContextService.deleteUserContext(conversationId);

    this.#logger.log(`Conversation ${conversationId} and user context deleted`);
  }
}
