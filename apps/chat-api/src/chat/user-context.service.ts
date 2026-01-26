import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';

/**
 * Input schema for the get_user_info tool
 * No input required - user context is automatically extracted from runtime config
 */
const GetUserInfoInputSchema = z.object({});

/**
 * Output schema for the get_user_info tool
 * Defines the structure of successful and error responses
 */
const GetUserInfoOutputSchema = z.union([
  // Success response
  z.object({
    success: z.literal(true),
    name: z.string().describe("The user's name"),
    conversationId: z.string().describe('The conversation ID'),
  }),
  // Error response
  z.object({
    success: z.literal(false),
    error: z.string().describe('Error message explaining what went wrong'),
    suggestion: z.string().describe('Suggestion for how to proceed'),
    conversationId: z.string().describe('The conversation ID'),
  }),
]);

/**
 * Type definitions inferred from schemas
 */
type GetUserInfoOutput = z.infer<typeof GetUserInfoOutputSchema>;

/**
 * Service to provide user context as a LangChain tool
 * Uses LangChain's config system to pass user information to the agent
 */
@Injectable()
export class UserContextService {
  readonly #logger = new Logger(UserContextService.name);

  /**
   * Create a LangChain tool that provides user information to agents
   * The tool extracts user context (userName and conversationId) from runtime config
   *
   * This follows the LangChain pattern where context is passed through config.configurable
   * and automatically persisted via the checkpointer
   *
   * Input: {} (no parameters required)
   * Output: GetUserInfoOutput (success or error object)
   */
  createUserInfoTool() {
    const self = this; // Capture service instance for tool closure

    return tool(
      async (_input: Record<string, never>, config): Promise<GetUserInfoOutput> => {
        // Extract context from runtime config - this is the proper LangChain pattern
        const conversationId = config?.configurable?.thread_id as string | undefined;
        const userName = config?.configurable?.userName as string | undefined;

        if (!conversationId) {
          self.#logger.error('No thread_id found in runtime config');
          return {
            success: false,
            error: 'No conversation context available',
            suggestion: 'This is a system error. The conversation ID could not be determined.',
            conversationId: 'unknown',
          };
        }

        if (!userName) {
          self.#logger.warn(`No userName found in config for conversation ${conversationId}`);
          return {
            success: false,
            error: 'No user context found',
            suggestion: 'Please provide your name so I can personalize our conversation.',
            conversationId,
          };
        }

        self.#logger.debug(`User info tool called - User: ${userName}, Conversation: ${conversationId}`);

        // Return success response with user context
        return {
          success: true,
          name: userName,
          conversationId,
        };
      },
      {
        name: 'get_user_info',
        description:
          `Get information about the current user for personalized communication.

This tool requires no parameters - it automatically accesses the user context from the runtime configuration.

Call this tool to retrieve the user's name and personalize your responses.

Returns a structured JSON object with either:
- Success: { success: true, name: string, conversationId: string }
- Error: { success: false, error: string, suggestion: string, conversationId: string }`,
        schema: GetUserInfoInputSchema,
      },
    );
  }
}
