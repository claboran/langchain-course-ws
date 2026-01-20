import { ApiProperty } from '@nestjs/swagger';

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
}
