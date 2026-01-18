import { z } from 'zod';

/**
 * Schema definition for AskResult.
 *
 * This schema validates and describes the structure of the result for an "ask" operation, typically
 * used to encapsulate a summary response and an associated confidence score. The Zod descriptions
 * are included to provide the meta-information to the LLM for generating structured outputs.
 * Your LLM needs to support structured output generation for this to work effectively.
 * This gives better control over the output format and helps in parsing the response reliably.
 *
 * https://docs.langchain.com/oss/javascript/langchain/structured-output
 *
 * Properties:
 * - `summary`: A clear and concise textual summary of the answer, with a character limit
 *   of 1 to 2000 characters. Provides essential information in response to a user's query.
 * - `confidence`: A numerical value between 0 and 1 inclusive that represents the certainty
 *   level of the answer, where 1.0 indicates complete certainty and 0.0 indicates complete uncertainty.
 */
export const AskResultSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      'A clear and concise summary of the answer to the user\'s question. Maximum 2000 characters.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A confidence score between 0 and 1 indicating how confident you are in your answer. 1.0 means completely certain, 0.0 means completely uncertain.'
    ),
});

// infer the TypeScript type from the Zod schema
export type AskResult = z.infer<typeof AskResultSchema>;
