import { defineEventHandler, createError, getRouterParam } from 'h3';
import {
  ecommerceApiClient,
  callWithErrorHandling,
  validateConversationIdOrThrow,
} from '../../../../utils/communication.utils';

/**
 * DELETE /api/v1/ecommerce-assistant/:conversationId
 *
 * Delete a conversation from the e-commerce assistant.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates the conversation ID
 * 2. Forwards to the NestJS ecommerce-assistant-api backend
 * 3. Returns the success response
 */
export default defineEventHandler(async (event) => {
  try {
    const conversationId = validateConversationIdOrThrow(
      getRouterParam(event, 'conversationId'),
    );

    return await callWithErrorHandling(
      () =>
        ecommerceApiClient.ecommerceAssistantControllerRemoveConversation({
          conversationId,
        }),
      'E-commerce Assistant API',
    );
  } catch (error) {
    // Re-throw h3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Unexpected error in delete conversation endpoint:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
