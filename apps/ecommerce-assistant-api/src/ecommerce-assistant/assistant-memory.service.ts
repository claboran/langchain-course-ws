import { Injectable } from '@nestjs/common';
import { MemorySaver } from '@langchain/langgraph';

@Injectable()
export class AssistantMemoryService {
  readonly #checkPointer = new MemorySaver();

  get checkPointer() {
    return this.#checkPointer;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.#checkPointer.deleteThread(conversationId);
  }
}
