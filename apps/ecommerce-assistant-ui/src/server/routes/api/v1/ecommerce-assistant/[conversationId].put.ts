import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import {
  ecommerceApiClient,
  callWithErrorHandling,
  safeParseOrThrow,
  validateConversationIdOrThrow,
} from '../../../../utils/communication.utils';
import { ContinueConversationRequestSchema } from '../../../../../shared/ecommerce.schema';

/**
 * PUT /api/v1/ecommerce-assistant/:conversationId
 *
 * Continue an existing conversation with the e-commerce assistant.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates the conversation ID
 * 2. Validates the request body
 * 3. Forwards to the NestJS ecommerce-assistant-api backend
 * 4. Returns the response to the frontend
 */
export default defineEventHandler(async (event) => {
  try {
    const conversationId = validateConversationIdOrThrow(
      getRouterParam(event, 'conversationId'),
    );

    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(
      ContinueConversationRequestSchema,
      body,
    );

    return await callWithErrorHandling(
      () =>
        ecommerceApiClient.ecommerceAssistantControllerContinueConversation({
          conversationId,
          continueConversationRequestDto: validatedRequest,
        }),
      'E-commerce Assistant API',
    );
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
