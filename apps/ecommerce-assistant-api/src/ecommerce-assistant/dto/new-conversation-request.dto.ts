import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NewConversationRequestDto {
  @ApiProperty({
    description: 'User message to start the conversation',
    example: 'I am looking for a mystery book',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
