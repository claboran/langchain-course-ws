import { defineEventHandler, readBody, createError } from 'h3';
import {
  ecommerceApiClient,
  callWithErrorHandling,
  safeParseOrThrow,
  validateConversationIdOrThrow,
} from '../../../../utils/communication.utils';
import { z } from 'zod';

/**
 * Request schema
 */
const ContinueConversationRequestSchema = z.object({
  message: z.string().min(1).max(5000),
});

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
      event.context.params?.conversationId,
    );

    const body = await readBody(event);
    const validatedRequest = safeParseOrThrow(
      ContinueConversationRequestSchema,
      body,
    );

    const responseData = await callWithErrorHandling(
      () =>
        ecommerceApiClient.ecommerceAssistantControllerContinueConversation(
          conversationId,
          {
            continueConversationRequestDto: validatedRequest,
          },
        ),
      'E-commerce Assistant API',
    );

    return responseData;
  } catch (error) {
    // Re-throw h3 errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error(
      'Unexpected error in continue conversation endpoint:',
      error,
    );
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: 'An unexpected error occurred',
      },
    });
  }
});
