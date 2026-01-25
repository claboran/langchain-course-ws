import { Injectable, Logger } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChatResult, ChatResultSchema } from './chat.model';
import { AgentService } from './agent.service';
import { UserContextService } from './user-context.service';

@Injectable()
export class ChatService {
  readonly #logger = new Logger(ChatService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly userContextService: UserContextService,
  ) {}

  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      const { message, user, conversationId } = request;

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

      // Extract the last message from the agent
      const lastMessage = result.messages[result.messages.length - 1];

      // Parse the structured output from the message content
      const chatResult = ChatResultSchema.parse(
        lastMessage.content,
      ) as ChatResult;

      return ChatResponseDto.from(      {
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
