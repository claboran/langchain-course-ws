import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMistralAI } from '@langchain/mistralai';
import { AskResult, AskResultSchema } from './chat.model';

@Injectable()
export class ChatService {
  private model: ChatMistralAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MISTRAL_API_KEY');

    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not configured in .env file');
    }

    this.model = new ChatMistralAI({
      model: 'mistral-large-latest',
      apiKey: apiKey,
      temperature: 0.2,
    });
  }

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
