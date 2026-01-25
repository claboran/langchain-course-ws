import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NewChatRequestDto } from './dto/new-chat-request.dto';
import { ContinueChatRequestDto } from './dto/continue-chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChatResult } from './chat.model';
import { AgentService } from './agent.service';
import { UserContextService } from './user-context.service';
import { ChatMemoryService } from './chat-memory.service';

@Injectable()
export class ChatService {
  readonly #logger = new Logger(ChatService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly userContextService: UserContextService,
    private readonly chatMemoryService: ChatMemoryService,
  ) {}

  async createConversation(request: NewChatRequestDto): Promise<ChatResponseDto> {
    const conversationId = randomUUID();
    this.#logger.log(`Creating new conversation with ID: ${conversationId}`);
    return this.processMessage(conversationId, request.message, request.user);
  }

  async continueConversation(
    conversationId: string,
    request: ContinueChatRequestDto,
  ): Promise<ChatResponseDto> {
    this.#logger.log(`Continuing conversation: ${conversationId}`);
    return this.processMessage(conversationId, request.message, request.user);
  }

  async removeConversation(conversationId: string): Promise<void> {
    this.#logger.log(`Removing conversation: ${conversationId}`);
    await this.chatMemoryService.deleteConversation(conversationId);
  }

  private async processMessage(
    conversationId: string,
    message: string,
    user: string,
  ): Promise<ChatResponseDto> {
    try {
      // Store user context for this conversation
      this.userContextService.setUserContext(conversationId, user);

      // Configure the thread for this conversation
      const config = { configurable: { thread_id: conversationId } };

      // Get the agent from the agent service
      const agent = this.agentService.getAgent();

      // Invoke the agent with system prompt and user's message
      const result = await agent.invoke(
        {
          messages: [
            { role: 'system', content: this.createSystemPrompt() },
            { role: 'user', content: message },
          ],
        },
        config,
      );

      // Extract the structured response from the result
      // When using toolStrategy, the structured output is in result.structuredResponse
      const chatResult = result.structuredResponse as ChatResult;

      return ChatResponseDto.from({
        message: chatResult.response,
        conversationId,
        confidence: chatResult.confidence,
        hasMarkdown: chatResult.hasMarkdown,
      });
    } catch (error) {
      this.#logger.error('Error in chat service:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get response from AI: ${errorMessage}`);
    }
  }

  private createSystemPrompt(): string {
    return `You are a helpful assistant that answers questions clearly and concisely.
Always provide accurate information and indicate your confidence level in your responses.

When responding:
- Use **markdown formatting** (bold, italic, lists, headings) to structure your answers for better readability
- Include **code blocks** with appropriate language tags when showing code examples or technical snippets
- Create **mermaid diagrams** when explaining flows, processes, architectures, or relationships that benefit from visual representation
- Set hasMarkdown to true when your response contains any markdown formatting, code blocks, or mermaid diagrams

Examples when to use mermaid:
- Flowcharts for processes or decision trees
- Sequence diagrams for interactions
- Class diagrams for object relationships
- Architecture diagrams for system design

You have access to a 'get_user_info' tool. Use it with the conversationId to retrieve the user's name for personalized greetings and communication.`;
  }
}
