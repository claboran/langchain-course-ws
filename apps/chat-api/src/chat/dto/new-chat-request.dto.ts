import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NewChatRequestDto {
  @ApiProperty({
    description: 'The message from the user to start a new conversation',
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
}
