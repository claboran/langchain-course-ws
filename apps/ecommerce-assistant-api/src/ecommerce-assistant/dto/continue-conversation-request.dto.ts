import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContinueConversationRequestDto {
  @ApiProperty({
    description: 'Follow-up message in the conversation',
    example: 'Do you have any from Agatha Christie?',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
