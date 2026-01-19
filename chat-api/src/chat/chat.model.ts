import { z } from 'zod';

/**
 * Schema definition for ChatResult.
 *
 * This schema validates and describes the structure of the result for a chat operation.
 * The Zod descriptions are included to provide meta-information to the LLM for generating
 * structured outputs. This gives better control over the output format and helps in parsing
 * the response reliably.
 *
 * Properties:
 * - `response`: The assistant's response to the user's message
 * - `tone`: The tone of the response (friendly, professional, casual, etc.)
 */
export const ChatResultSchema = z.object({
  response: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      'A clear and helpful response to the user\'s message. Maximum 2000 characters.'
    ),
  tone: z
    .enum(['friendly', 'professional', 'casual', 'helpful'])
    .describe(
      'The tone used in the response. Should match the context and user preference.'
    ),
});

// Infer the TypeScript type from the Zod schema
export type ChatResult = z.infer<typeof ChatResultSchema>;
