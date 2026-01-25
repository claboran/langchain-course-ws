import { defineEventHandler, readBody, getRouterParam, createError } from 'h3';
import { ContinueChatRequestSchema, ChatResponseSchema } from '../../../../../shared';
import {
  chatApiClient,
  transformContinueChatRequestToDto,
  transformChatResponseFromDto,
  callWithErrorHandling,
  safeParseOrThrow,
  validateConversationIdOrThrow,
} from '../../../../utils/communication.utils';


/**
 * PUT /api/v1/chat/:conversationId
 *
 * Continue an existing conversation with the AI assistant.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates the conversationId from the route parameter
 * 2. Validates incoming requests with Zod
 * 3. Forwards to the NestJS chat-api backend using the generated OpenAPI client
 * 4. Validates the response
 * 5. Returns type-safe data to the frontend
 */
export default defineEventHandler(async (event) => {
  try {
    const conversationId = validateConversationIdOrThrow(
      getRouterParam(event, 'conversationId'),
    );

    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(ContinueChatRequestSchema, body);

    const responseData = await callWithErrorHandling(
      () =>
        chatApiClient.chatControllerContinueConversation({
          conversationId,
          continueChatRequestDto: transformContinueChatRequestToDto(validatedRequest),
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
    console.error('Unexpected error in continue conversation endpoint:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
