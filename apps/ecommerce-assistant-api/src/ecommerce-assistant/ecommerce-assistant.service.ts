import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentService } from './agent.service';
import { AssistantMemoryService } from './assistant-memory.service';
import { NewConversationRequestDto } from './dto/new-conversation-request.dto';
import { ContinueConversationRequestDto } from './dto/continue-conversation-request.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { EcommerceResult } from './ecommerce-assistant.model';

@Injectable()
export class EcommerceAssistantService {
  readonly #logger = new Logger(EcommerceAssistantService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly assistantMemoryService: AssistantMemoryService,
  ) {}

  async createConversation(
    request: NewConversationRequestDto,
  ): Promise<ConversationResponseDto> {
    const conversationId = randomUUID();
    this.#logger.log(`Creating conversation: ${conversationId}`);
    return this.processMessage(conversationId, request.message);
  }

  async continueConversation(
    conversationId: string,
    request: ContinueConversationRequestDto,
  ): Promise<ConversationResponseDto> {
    this.#logger.log(`Continuing conversation: ${conversationId}`);
    return this.processMessage(conversationId, request.message);
  }

  async removeConversation(conversationId: string): Promise<void> {
    this.#logger.log(`Removing conversation: ${conversationId}`);
    await this.assistantMemoryService.deleteConversation(conversationId);
  }

  private async processMessage(
    conversationId: string,
    message: string,
  ): Promise<ConversationResponseDto> {
    try {
      const config = {
        configurable: {
          thread_id: conversationId,
        }
      };

      const agent = this.agentService.getAgent();
      const systemPrompt = this.createSystemPrompt();

      this.#logger.log('Invoking agent with product search capabilities');
      const result = await agent.invoke(
        {
          messages: [
            new SystemMessage(systemPrompt),
            new HumanMessage(message),
          ],
        },
        config
      );

      const ecommerceResult = result.structuredResponse as EcommerceResult;

      this.#logger.log(
        `Response generated with ${ecommerceResult.products.length} products`
      );

      return ConversationResponseDto.from({
        summary: ecommerceResult.summary,
        products: ecommerceResult.products,
        hasProducts: ecommerceResult.hasProducts,
        hasMarkdown: ecommerceResult.hasMarkdown,
        conversationId,
      });
    } catch (error) {
      this.#logger.error('Error in assistant service:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get response from AI: ${errorMessage}`);
    }
  }

  private createSystemPrompt(): string {
    return `You are a helpful e-commerce shopping assistant.

## Your Capabilities

You have access to two tools:

1. **search_products**: Search for products using semantic search
   - Use when users ask about specific products or types of products
   - Returns a JSON string with product data (content and metadata)
   - You can optionally filter by category

2. **get_categories**: Get available shop categories
   - Use when users ask "what do you sell?" or "what categories do you have?"

## Instructions

- Always use the search_products tool when users ask about products
- The search_products tool returns a JSON string - parse it to get the product data
- Only use get_categories when users want to know available categories
- Provide helpful, concise summaries of products found
- If no products match, suggest alternatives or ask clarifying questions
- Be friendly and professional
- If a search returns no results, explain this clearly and offer to help refine the search
- You can use Markdown formatting (bold, italic, lists, etc.) to make your responses more readable

## Response Format

Your responses will be automatically structured with:
- summary: Your text response to the user (describe the products you found). Use Markdown for better formatting.
- products: Array of product documents you received from the tool (parse the JSON from search_products)
- hasProducts: Boolean - set to true if you got products from the tool, false otherwise
- hasMarkdown: Boolean - set to true if your summary contains Markdown formatting, code blocks, or lists`;
  }
}
