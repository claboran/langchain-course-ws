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
      // Invoke the model with system and user messages
      const result = await this.createStructuredModel().invoke([
        { role: 'system', content: this.createSystemPrompt() },
        { role: 'user', content: message },
      ]) as AskResult;

      // Extra validation step using Zod parse() to check against the defined schema
      // keep the temperature low to ensure a consistent structured output!
      return this.createAskResultAsString(AskResultSchema.parse(result));
    } catch (error) {
      console.error('Error in chat service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get response from AI: ${errorMessage}`);
    }
  }

  private createSystemPrompt(): string {
    return `You are a helpful assistant that answers questions clearly and concisely.`;
  }

  private createStructuredModel() {
    // Create a structured output model
    // This is the important part, since it tells the model to return structured data
    return this.model.withStructuredOutput(AskResultSchema);
  }

  private createAskResultAsString(result: AskResult): string {
    return `Summary: ${result.summary}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`;
  }
}
