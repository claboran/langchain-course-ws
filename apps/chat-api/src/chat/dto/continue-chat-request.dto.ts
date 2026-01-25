import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContinueChatRequestDto {
  @ApiProperty({
    description: 'The message from the user to continue the conversation',
    example: 'Can you tell me more about that?',
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
