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
      this.#logger.log(`Processing message for conversation ${conversationId} from user ${user}`);

      // Configure the thread for this conversation
      // LangChain will use conversationId as the thread_id to persist conversation state
      // We also pass userName through config so the get_user_info tool can access it
      const config = {
        configurable: {
          thread_id: conversationId,
          userName: user,
        }
      };

      this.#logger.debug(`Config prepared with thread_id: ${conversationId}, userName: ${user}`);

      // Get the agent from the agent service
      const agent = this.agentService.getAgent();

      // Create system prompt that encourages tool usage
      const systemPrompt = this.createSystemPrompt();
      this.#logger.debug('System prompt created with personalized instructions');

      // Invoke the agent with system prompt and user's message
      // The agent will automatically use the get_user_info tool when needed
      // User context (conversationId and userName) is passed via config.configurable
      // The checkpointer will persist conversation history per thread_id
      this.#logger.log('Invoking agent - expecting tool usage for personalization');
      const result = await agent.invoke(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        },
        config,
      );

      // Extract the structured response from the result
      // When using toolStrategy, the structured output is in result.structuredResponse
      const chatResult = result.structuredResponse as ChatResult;

      this.#logger.log(`Agent response generated with confidence: ${chatResult.confidence}`);
      this.#logger.debug(`Response preview: ${chatResult.response.substring(0, 100)}...`);

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

## CRITICAL INSTRUCTIONS FOR PERSONALIZATION ##

1. **IMMEDIATE TOOL USAGE**: At the very START of EVERY conversation, you MUST use the 'get_user_info' tool.
   - Call the tool with NO parameters (it automatically accesses the conversation context)
   - This will retrieve the user's name and other context
   - Do this BEFORE responding to the user's message

2. **PERSONALIZATION REQUIREMENT**: Once you have the user's name from the tool:
   - Address the user by name in your response (e.g., "Hello John, here's the information you requested...")
   - Use their name naturally throughout the conversation
   - Make references that show you remember who they are

3. **ERROR HANDLING**: If the tool returns an error or no user context:
   - Politely ask the user for their name
   - Explain that you want to personalize the conversation
   - Continue providing helpful information even without their name

## RESPONSE FORMATTING GUIDELINES ##

When responding:
- Use **markdown formatting** (bold, italic, lists, headings) to structure your answers for better readability
- Include **code blocks** with appropriate language tags when showing code examples or technical snippets
- Create **mermaid diagrams** when explaining flows, processes, architectures, or relationships that benefit from visual representation
- Set hasMarkdown to true when your response contains any markdown formatting, code blocks, or mermaid diagrams

## MERMAID DIAGRAM EXAMPLES ##

Use mermaid for:
- Flowcharts for processes or decision trees
- Sequence diagrams for interactions
- Class diagrams for object relationships
- Architecture diagrams for system design

## EXAMPLE CONVERSATION FLOW ##

User: "What is TypeScript?"
You: [Call get_user_info tool with no parameters]
You: "Hello [User's Name], TypeScript is a typed superset of JavaScript..."

Remember:
- Personalization is MANDATORY
- ALWAYS call the get_user_info tool at the start
- The tool requires NO parameters - it automatically accesses the conversation context`;
  }
}
