import { defineEventHandler, readBody, createError } from 'h3';
import { ChatRequestSchema, ChatResponseSchema } from '../../../../shared';

// Backend API URL - configurable via environment variable
const CHAT_API_URL = process.env['CHAT_API_URL'] || 'http://localhost:3311';

/**
 * POST /api/v1/chat
 *
 * Proxies chat requests to the chat-api backend.
 * This acts as a BFF (Backend-for-Frontend) layer that:
 * 1. Validates incoming requests with Zod
 * 2. Forwards to the NestJS chat-api backend
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
          errors: validationResult.error.format(),
        },
      });
    }

    const validatedRequest = validationResult.data;

    // 3. Forward request to chat-api backend
    const response = await fetch(`${CHAT_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedRequest),
    });

    // 4. Handle backend errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      throw createError({
        statusCode: response.status,
        statusMessage: 'Chat API Error',
        data: {
          message: 'Failed to get response from chat service',
          details: response.statusText,
        },
      });
    }

    // 5. Parse response
    const responseData = await response.json();

    // 6. Validate response with Zod schema
    const responseValidation = ChatResponseSchema.safeParse(responseData);

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

    // 7. Return validated response
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
