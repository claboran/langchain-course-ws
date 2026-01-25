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
    .max(5000)
    .describe(
      "A clear and helpful response to the user's message. Maximum 5000 characters.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A confidence score between 0 and 1 indicating how confident you are in your answer. 1.0 means completely certain, 0.0 means completely uncertain.',
    ),
  hasMarkdown: z
    .boolean()
    .describe(
      'Indicates whether the response contains Markdown formatting, or Mermaid or Code.',
    ),
});

// Infer the TypeScript type from the Zod schema
export type ChatResult = z.infer<typeof ChatResultSchema>;
