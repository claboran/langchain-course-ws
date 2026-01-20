import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the chat assistant',
    description: 'Send a message to the AI assistant and receive a response. The conversation is maintained using the conversationId, allowing for multi-turn conversations with context. The assistant has access to user information for personalization.',
  })
  @ApiBody({
    type: ChatRequestDto,
    description: 'Chat request containing the message, user name, and conversation ID',
    examples: {
      firstMessage: {
        summary: 'First message in a conversation',
        description: 'Starting a new conversation with a greeting',
        value: {
          message: 'Hello! What can you help me with?',
          user: 'John Doe',
          conversationId: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      followUp: {
        summary: 'Follow-up message',
        description: 'Continuing an existing conversation with the same conversationId',
        value: {
          message: 'Can you tell me more about that?',
          user: 'John Doe',
          conversationId: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      personalizedQuestion: {
        summary: 'Question requiring user context',
        description: 'Asking a question where the assistant can use the user tool for personalization',
        value: {
          message: 'What is my name?',
          user: 'Alice Smith',
          conversationId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully received a response from the assistant',
    type: ChatResponseDto,
    example: {
      message: 'Hello John Doe! I can help you with a wide variety of tasks including answering questions, providing information, helping with problem-solving, and having conversations. What would you like assistance with today?',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data (e.g., missing required fields, invalid UUID format)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['message should not be empty', 'conversationId must be a UUID'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - failed to get response from AI',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to get response from AI: Connection timeout' },
      },
    },
  })
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.chat(request);
  }
}
