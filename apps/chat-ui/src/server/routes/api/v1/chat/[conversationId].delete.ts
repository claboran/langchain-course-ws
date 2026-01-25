import { defineEventHandler, getRouterParam, createError } from 'h3';
import {
  chatApiClient,
  callWithErrorHandling,
  validateConversationIdOrThrow,
} from '../../../../utils/communication.utils';


/**
 * DELETE /api/v1/chat/:conversationId
 *
 * Remove a conversation and its message history.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates the conversationId from the route parameter
 * 2. Forwards to the NestJS chat-api backend using the generated OpenAPI client
 * 3. Returns confirmation to the frontend
 */
export default defineEventHandler(async (event) => {
  try {
    const conversationId = validateConversationIdOrThrow(
      getRouterParam(event, 'conversationId'),
    );
    return await callWithErrorHandling(
      () =>
        chatApiClient.chatControllerRemoveConversation({
          conversationId,
        }),
      'Chat API',
    );
  } catch (error) {
    // Re-throw h3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Unexpected error in remove conversation endpoint:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
