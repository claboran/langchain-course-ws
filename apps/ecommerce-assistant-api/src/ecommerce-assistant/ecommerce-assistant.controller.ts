import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { EcommerceAssistantService } from './ecommerce-assistant.service';
import { NewConversationRequestDto } from './dto/new-conversation-request.dto';
import { ContinueConversationRequestDto } from './dto/continue-conversation-request.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@ApiTags('ecommerce-assistant')
@Controller('ecommerce-assistant')
export class EcommerceAssistantController {
  constructor(private readonly assistantService: EcommerceAssistantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new e-commerce conversation',
    description: 'Create a new conversation with the e-commerce assistant. Ask about products or shop categories.'
  })
  @ApiBody({
    type: NewConversationRequestDto,
    examples: {
      'Product Search': {
        value: { message: 'I need a good mystery book' }
      },
      'Category Query': {
        value: { message: 'What does your shop sell?' }
      },
      'Specific Search': {
        value: { message: 'Show me kitchen utensils' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Conversation created', type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createConversation(
    @Body() request: NewConversationRequestDto
  ): Promise<ConversationResponseDto> {
    return this.assistantService.createConversation(request);
  }

  @Put(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Continue an existing conversation',
    description: 'Send follow-up messages using the conversationId from the initial request'
  })
  @ApiParam({
    name: 'conversationId',
    format: 'uuid',
    description: 'The conversation ID returned from the initial request'
  })
  @ApiBody({
    type: ContinueConversationRequestDto,
    examples: {
      'Follow-up': {
        value: { message: 'Do you have anything by Agatha Christie?' }
      },
      'Refinement': {
        value: { message: 'Show me something cheaper' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Conversation continued', type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async continueConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() request: ContinueConversationRequestDto
  ): Promise<ConversationResponseDto> {
    return this.assistantService.continueConversation(conversationId, request);
  }

  @Delete(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a conversation',
    description: 'Delete conversation and its history from memory'
  })
  @ApiParam({
    name: 'conversationId',
    format: 'uuid',
    description: 'The conversation ID to delete'
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation removed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Conversation removed successfully' }
      }
    }
  })
  async removeConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string
  ): Promise<{ message: string }> {
    await this.assistantService.removeConversation(conversationId);
    return { message: 'Conversation removed successfully' };
  }
}
