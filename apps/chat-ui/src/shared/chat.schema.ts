import { z } from 'zod';

/**
 * New Chat Request Schema
 * Used for starting a new conversation with the chat API
 */
export const NewChatRequestSchema = z.object({
  /**
   * The message from the user to start a new conversation
   */
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),

  /**
   * The name of the user sending the message. Used for personalization.
   */
  user: z.string().min(1, 'User name is required').max(100, 'User name is too long'),
});

/**
 * Continue Chat Request Schema
 * Used for continuing an existing conversation
 */
export const ContinueChatRequestSchema = z.object({
  /**
   * The message from the user to continue the conversation
   */
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),

  /**
   * The name of the user sending the message. Used for personalization.
   */
  user: z.string().min(1, 'User name is required').max(100, 'User name is too long'),
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

  /**
   * Confidence score between 0 and 1 indicating how confident the AI is in its answer
   */
  confidence: z.number().min(0).max(1),

  /**
   * Indicates whether the response contains Markdown formatting, Mermaid diagrams, or code blocks
   */
  hasMarkdown: z.boolean(),
});

/**
 * Conversation ID schema (UUID) — exported so other modules can reuse it
 */
export const ConversationIdSchema = z.string().uuid();

export type ConversationId = z.infer<typeof ConversationIdSchema>;

/**
 * Error Response Schema
 * Standard error response from the API
 */
export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});

// Export inferred types
export type NewChatRequest = z.infer<typeof NewChatRequestSchema>;
export type ContinueChatRequest = z.infer<typeof ContinueChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
