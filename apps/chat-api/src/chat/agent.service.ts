import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { createAgent, toolStrategy } from 'langchain';
import { ChatResultSchema } from './chat.model';
import { ChatMemoryService } from './chat-memory.service';
import { UserContextService } from './user-context.service';

@Injectable()
export class AgentService {
  readonly #logger = new Logger(AgentService.name);
  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject(CHAT_MISTRAL_AI) private readonly model: ChatMistralAI,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly userContextService: UserContextService,
  ) {
    this.#logger.log('Initializing LangChain agent...');

    // Create agent once during service initialization
    // Get the user info tool from the UserContextService (encapsulated)
    this.agent = createAgent({
      model: this.model,
      tools: [this.userContextService.createUserInfoTool()],
      checkpointer: this.chatMemoryService.checkPointer,
      responseFormat: toolStrategy(ChatResultSchema),
    });

    this.#logger.log('LangChain agent initialized successfully');
  }

  /**
   * Get the initialized agent instance
   */
  getAgent() {
    return this.agent;
  }
}
