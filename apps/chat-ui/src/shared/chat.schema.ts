import { z } from 'zod';

/**
 * Chat Request Schema
 * Used for sending messages to the chat API
 */
export const ChatRequestSchema = z.object({
  /**
   * The message from the user
   */
  message: z.string().min(1, 'Message is required').max(10000, 'Message is too long'),

  /**
   * The name of the user sending the message. Used for personalization.
   */
  user: z.string().min(1, 'User name is required').max(100, 'User name is too long'),

  /**
   * UUID identifying the conversation thread.
   * Use the same ID for all messages in a conversation to maintain context.
   */
  conversationId: z.string().uuid('Invalid conversation ID format'),
});

/**
 * Chat Response Schema
 * Expected response from the chat API
 */
export const ChatResponseSchema = z.object({
  /**
   * The assistant's response message
   */
  message: z.string(),

  /**
   * The conversation ID that was used for this exchange
   */
  conversationId: z.string().uuid(),
});

/**
 * Error Response Schema
 * Standard error response from the API
 */
export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
});

// Export inferred types
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
