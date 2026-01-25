import { defineEventHandler, readBody, createError } from 'h3';
import { ChatRequestSchema, ChatResponseSchema } from '../../../../shared';
import {
  chatApiClient,
  transformChatRequestToDto,
  transformChatResponseFromDto,
  callWithErrorHandling,
  safeParseOrThrow,
} from '../../../utils/communication.utils';


/**
 * POST /api/v1/chat
 *
 * Proxies chat requests to the chat-api backend.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates incoming requests with Zod
 * 2. Forwards to the NestJS chat-api backend using the generated OpenAPI client
 * 3. Validates the response
 * 4. Returns type-safe data to the frontend
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(ChatRequestSchema, body);

    const responseData = await callWithErrorHandling(
      () =>
        chatApiClient.chatControllerChat({ chatRequestDto: transformChatRequestToDto(validatedRequest) }),
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
