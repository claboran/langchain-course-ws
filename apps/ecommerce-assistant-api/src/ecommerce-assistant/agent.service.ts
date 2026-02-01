import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { createAgent, toolStrategy } from 'langchain';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { AssistantMemoryService } from './assistant-memory.service';
import { ProductSearchService } from './tools/product-search.service';
import { CategoryService } from './tools/category.service';
import { EcommerceResultSchema } from './ecommerce-assistant.model';

@Injectable()
export class AgentService {
  readonly #logger = new Logger(AgentService.name);
  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject(CHAT_MISTRAL_AI) private readonly model: ChatMistralAI,
    private readonly assistantMemoryService: AssistantMemoryService,
    private readonly productSearchService: ProductSearchService,
    private readonly categoryService: CategoryService,
  ) {
    this.#logger.log('Initializing LangChain agent for e-commerce assistant...');

    const productSearchTool = this.productSearchService.createProductSearchTool();
    const categoryTool = this.categoryService.createCategoryTool();

    this.agent = createAgent({
      model: this.model,
      tools: [productSearchTool, categoryTool],
      checkpointer: this.assistantMemoryService.checkPointer,
      responseFormat: toolStrategy(EcommerceResultSchema),
    });

    this.#logger.log('Agent initialized with product search and category tools');
  }

  getAgent() {
    return this.agent;
  }
}
