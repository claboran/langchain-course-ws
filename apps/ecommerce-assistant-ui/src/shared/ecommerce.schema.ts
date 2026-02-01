import { z } from 'zod';

/**
 * Conversation ID schema (UUID)
 */
export const ConversationIdSchema = z.string().uuid();

export type ConversationId = z.infer<typeof ConversationIdSchema>;

/**
 * New Conversation Request Schema
 */
export const NewConversationRequestSchema = z.object({
  /**
   * The message from the user to start a new conversation
   */
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
});

/**
 * Continue Conversation Request Schema
 */
export const ContinueConversationRequestSchema = z.object({
  /**
   * The message from the user to continue the conversation
   */
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
});

/**
 * Product Document Schema
 */
export const ProductDocumentSchema = z.object({
  content: z.string(),
  metadata: z
    .object({
      id: z.string(),
      category: z.string(),
    })
    .passthrough(),
});

/**
 * Conversation Response Schema
 */
export const ConversationResponseSchema = z.object({
  summary: z.string(),
  products: z.array(ProductDocumentSchema),
  hasProducts: z.boolean(),
  hasMarkdown: z.boolean(),
  conversationId: ConversationIdSchema,
});

export type NewConversationRequest = z.infer<typeof NewConversationRequestSchema>;
export type ContinueConversationRequest = z.infer<typeof ContinueConversationRequestSchema>;
export type ProductDocument = z.infer<typeof ProductDocumentSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
