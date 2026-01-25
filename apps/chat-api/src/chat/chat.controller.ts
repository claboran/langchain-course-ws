import { Body, Controller, Post, Put, Delete, HttpCode, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { NewChatRequestDto } from './dto/new-chat-request.dto';
import { ContinueChatRequestDto } from './dto/continue-chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new conversation',
    description: 'Create a new conversation with the AI assistant. The server will generate and return a conversationId that should be used for follow-up messages.',
  })
  @ApiBody({
    type: NewChatRequestDto,
    description: 'New chat request containing the first message and user name',
    examples: {
      firstMessage: {
        summary: 'First message in a conversation',
        description: 'Starting a new conversation with a greeting',
        value: {
          message: 'Hello! What can you help me with?',
          user: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created a new conversation and received a response',
    type: ChatResponseDto,
    example: {
      message: 'Hello John Doe! I can help you with a wide variety of tasks including answering questions, providing information, helping with problem-solving, and having conversations. What would you like assistance with today?',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data (e.g., missing required fields)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['message should not be empty', 'user should not be empty'],
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
  async createConversation(@Body() request: NewChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.createConversation(request);
  }

  @Put(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Continue an existing conversation',
    description: 'Send a follow-up message to an existing conversation. Use the conversationId returned from the initial POST request.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'UUID of the conversation to continue',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiBody({
    type: ContinueChatRequestDto,
    description: 'Chat request containing the message and user name',
    examples: {
      followUp: {
        summary: 'Follow-up message',
        description: 'Continuing an existing conversation',
        value: {
          message: 'Can you tell me more about that?',
          user: 'John Doe',
        },
      },
      personalizedQuestion: {
        summary: 'Question requiring user context',
        description: 'Asking a question where the assistant can use the user tool for personalization',
        value: {
          message: 'What is my name?',
          user: 'Alice Smith',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully received a response from the assistant',
    type: ChatResponseDto,
    example: {
      message: 'I\'d be happy to tell you more! What specific aspect would you like me to elaborate on?',
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
          example: ['message should not be empty'],
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
  async continueConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() request: ContinueChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.continueConversation(conversationId, request);
  }

  @Delete(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a conversation',
    description: 'Delete a conversation and its entire message history by conversationId',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'UUID of the conversation to remove',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation successfully removed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Conversation removed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['conversationId must be a UUID'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - failed to remove conversation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to remove conversation' },
      },
    },
  })
  async removeConversation(@Param('conversationId', ParseUUIDPipe) conversationId: string): Promise<{ message: string }> {
    await this.chatService.removeConversation(conversationId);
    return { message: 'Conversation removed successfully' };
  }
}
