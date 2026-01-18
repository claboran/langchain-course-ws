import { Inject, Injectable } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { AskResult, AskResultSchema } from './chat.model';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_MISTRAL_AI) private readonly model: ChatMistralAI,
  ) {}

  async chat(message: string): Promise<string> {
    try {
      // Create a structured output model
      const structuredModel = this.model.withStructuredOutput(AskResultSchema);

      // System prompt
      const systemPrompt = `You are a helpful assistant that answers questions clearly and concisely.`;

      // Invoke the model with system and user messages
      const result = await structuredModel.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ]);

      const typedResult = result as AskResult;

      // Format the output
      return `Summary: ${typedResult.summary}\nConfidence: ${(typedResult.confidence * 100).toFixed(1)}%`;
    } catch (error) {
      console.error('Error in chat service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get response from AI: ${errorMessage}`);
    }
  }
}
