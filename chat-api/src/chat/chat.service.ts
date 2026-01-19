import { Inject, Injectable } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { tool } from 'langchain';
import { z } from 'zod';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Injectable()
export class ChatService {
  private readonly checkpointer = new MemorySaver();

  constructor(
    @Inject(CHAT_MISTRAL_AI) private readonly model: ChatMistralAI,
  ) {}

  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      const { message, user, conversationId } = request;

      // Create user info tool
      const userInfoTool = this.createUserInfoTool(user);

      // Create agent with memory and tools
      const agent = createAgent({
        model: this.model,
        tools: [userInfoTool],
        checkpointer: this.checkpointer,
      });

      // Configure the thread for this conversation
      const config = { configurable: { thread_id: conversationId } };

      // Invoke the agent with the user's message
      const result = await agent.invoke(
        { messages: [{ role: 'user', content: message }] },
        config
      );

      // Extract the last message from the agent
      const lastMessage = result.messages[result.messages.length - 1];
      const responseContent = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

      return {
        message: responseContent,
        conversationId,
      };
    } catch (error) {
      console.error('Error in chat service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get response from AI: ${errorMessage}`);
    }
  }

  private createUserInfoTool(userName: string) {
    return tool(
      async () => {
        // This tool returns user information that the assistant can use
        // for personalized communication
        return JSON.stringify({
          name: userName,
          timestamp: new Date().toISOString(),
        });
      },
      {
        name: 'get_user_info',
        description: 'Get information about the current user for personalized communication. Use this tool to access the user\'s name and other details.',
        schema: z.object({}),
      }
    );
  }
}
