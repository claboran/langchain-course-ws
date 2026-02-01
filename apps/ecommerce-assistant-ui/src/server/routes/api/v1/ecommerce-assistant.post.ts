import { defineEventHandler, readBody, createError } from 'h3';
import {
  ecommerceApiClient,
  callWithErrorHandling,
  safeParseOrThrow,
} from '../../../utils/communication.utils';
import { NewConversationRequestSchema } from '../../../../shared/ecommerce.schema';

/**
 * POST /api/v1/ecommerce-assistant
 *
 * Start a new conversation with the e-commerce assistant.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates incoming requests with Zod
 * 2. Forwards to the NestJS ecommerce-assistant-api backend
 * 3. Returns the response to the frontend
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(
      NewConversationRequestSchema,
      body,
    );

    const responseData = await callWithErrorHandling(
      () =>
        ecommerceApiClient.ecommerceAssistantControllerCreateConversation({
          newConversationRequestDto: validatedRequest,
        }),
      'E-commerce Assistant API',
    );

    return responseData;
  } catch (error) {
    // Re-throw h3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Unexpected error in ecommerce-assistant endpoint:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
