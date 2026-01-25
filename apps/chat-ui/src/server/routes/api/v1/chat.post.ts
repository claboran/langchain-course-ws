import { defineEventHandler, readBody, createError } from 'h3';
import { NewChatRequestSchema, ChatResponseSchema } from '../../../../shared';
import {
  chatApiClient,
  transformNewChatRequestToDto,
  transformChatResponseFromDto,
  callWithErrorHandling,
  safeParseOrThrow,
} from '../../../utils/communication.utils';


/**
 * POST /api/v1/chat
 *
 * Start a new conversation with the AI assistant.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates incoming requests with Zod
 * 2. Forwards to the NestJS chat-api backend using the generated OpenAPI client
 * 3. Validates the response
 * 4. Returns type-safe data to the frontend (including the new conversationId)
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(NewChatRequestSchema, body);

    const responseData = await callWithErrorHandling(
      () =>
        chatApiClient.chatControllerCreateConversation({
          newChatRequestDto: transformNewChatRequestToDto(validatedRequest)
        }),
      'Chat API',
    );

    const transformedResponse = transformChatResponseFromDto(responseData);
    return safeParseOrThrow(ChatResponseSchema, transformedResponse, {
      statusCode: 500,
      statusMessage: 'Invalid Response',
      message: 'Received invalid response from chat service',
    });
  } catch (error) {
    // Re-throw h3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Unexpected error in chat endpoint:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
