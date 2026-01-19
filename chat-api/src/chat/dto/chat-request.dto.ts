import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    description: 'The message from the user',
    example: 'Hello! Can you help me understand how multi-turn conversations work?',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'The name of the user sending the message. Used for personalization.',
    example: 'Alice Johnson',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  user!: string;

  @ApiProperty({
    description: 'UUID identifying the conversation thread. Use the same ID for all messages in a conversation to maintain context.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;
}
