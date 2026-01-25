import { ApiProperty } from '@nestjs/swagger';

/**
 * Type definition for ChatResponseDto properties
 */
export type ChatResponseType = {
  message: string;
  conversationId: string;
  confidence: number;
  hasMarkdown: boolean;
};

export class ChatResponseDto {
  @ApiProperty({
    description: 'The assistant\'s response message',
    example: 'Hello Alice Johnson! I\'d be happy to help you understand multi-turn conversations. They allow us to maintain context across multiple exchanges, so I can remember what we\'ve discussed earlier in our conversation.',
  })
  message!: string;

  @ApiProperty({
    description: 'The conversation ID that was used for this exchange',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  conversationId!: string;

  @ApiProperty({
    description: 'Confidence score between 0 and 1 indicating how confident the AI is in its answer',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence!: number;

  @ApiProperty({
    description: 'Indicates whether the response contains Markdown formatting, Mermaid diagrams, or code blocks',
    example: false,
  })
  hasMarkdown!: boolean;

  constructor() {}

  /**
   * Factory method to create a ChatResponseDto from a data object
   */
  static from(data: ChatResponseType): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.message = data.message;
    dto.conversationId = data.conversationId;
    dto.confidence = data.confidence;
    dto.hasMarkdown = data.hasMarkdown;
    return dto;
  }
}

