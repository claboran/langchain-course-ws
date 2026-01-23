import { defineEventHandler, readBody, createError } from 'h3';
import { ChatRequestSchema, ChatResponseSchema } from '../../../../shared';
import { z } from 'zod';
import {
  chatApiClient,
  transformChatRequestToDto,
  transformChatResponseFromDto,
  callWithErrorHandling,
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
    // 1. Parse request body
    const body = await readBody(event);

    // 2. Validate with Zod schema
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: {
          errors: z.treeifyError(validationResult.error),  // validationResult.error.format(),
        },
      });
    }

    const validatedRequest = validationResult.data;

    // 3. Use generated OpenAPI client to forward request

    const responseData = await callWithErrorHandling(
      () => chatApiClient
        .chatControllerChat({ chatRequestDto: transformChatRequestToDto(validatedRequest) }),
      'Chat API',
    );

    // 4. Transform DTO to app shared model and validate response with Zod schema
    const transformedResponse = transformChatResponseFromDto(responseData);
    const responseValidation = ChatResponseSchema.safeParse(transformedResponse);

    if (!responseValidation.success) {
      console.error('Invalid response from chat API:', responseValidation.error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid Response',
        data: {
          message: 'Received invalid response from chat service',
        },
      });
    }

    // 5. Return validated response
    return responseValidation.data;
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
