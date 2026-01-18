import { z } from 'zod';

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

export type AskResult = z.infer<typeof AskResultSchema>;
