import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';

/**
 * Input schema for the get_user_info tool
 */
const GetUserInfoInputSchema = z.object({
  conversationId: z
    .string()
    .describe(
      'The conversation ID to look up user context. Extract this from the system message that contains [INTERNAL: conversation_id=...]',
    ),
});

/**
 * Output schema for the get_user_info tool
 * Defines the structure of successful and error responses
 */
const GetUserInfoOutputSchema = z.union([
  // Success response
  z.object({
    success: z.literal(true),
    name: z.string().describe("The user's name"),
    timestamp: z.string().describe('ISO timestamp when the context was stored'),
    conversationId: z.string().describe('The conversation ID that was looked up'),
  }),
  // Error response
  z.object({
    success: z.literal(false),
    error: z.string().describe('Error message explaining what went wrong'),
    suggestion: z.string().describe('Suggestion for how to proceed'),
    conversationId: z.string().describe('The conversation ID that was looked up'),
  }),
]);

/**
 * Type definitions inferred from schemas
 */
type GetUserInfoInput = z.infer<typeof GetUserInfoInputSchema>;
type GetUserInfoOutput = z.infer<typeof GetUserInfoOutputSchema>;

/**
 * Service to manage user context information per conversation
 * Provides both storage and tool access for LangChain agents
 */
@Injectable()
export class UserContextService {
  readonly #logger = new Logger(UserContextService.name);
  private readonly userContextMap = new Map<string, { userName: string; timestamp: Date }>();

  /**
   * Store user information for a conversation
   */
  setUserContext(conversationId: string, userName: string): void {
    this.userContextMap.set(conversationId, {
      userName,
      timestamp: new Date(),
    });

    this.#logger.debug(`User context set for conversation ${conversationId}: ${userName}`);
  }

  /**
   * Get user information for a conversation ID
   */
  getUserContext(conversationId: string): { userName: string; timestamp: Date } | null {
    return this.userContextMap.get(conversationId) || null;
  }

  /**
   * Remove user context for a conversation
   */
  deleteUserContext(conversationId: string): void {
    this.userContextMap.delete(conversationId);
    this.#logger.debug(`User context deleted for conversation ${conversationId}`);
  }

  /**
   * Clear all user contexts
   */
  clearAll(): void {
    this.userContextMap.clear();
    this.#logger.log('All user contexts cleared');
  }

  /**
   * Create a LangChain tool that provides user information to agents
   * The tool accepts conversationId to look up the correct user context
   *
   * Input: { conversationId: string }
   * Output: GetUserInfoOutput (success or error object)
   */
  createUserInfoTool() {
    const self = this; // Capture service instance for tool closure

    return tool(
      async ({ conversationId }: GetUserInfoInput): Promise<GetUserInfoOutput> => {
        self.#logger.debug(`User info tool called for conversation: ${conversationId}`);

        // Look up the specific user context for this conversation
        const context = self.getUserContext(conversationId);

        if (!context) {
          self.#logger.warn(`No user context available for conversation ${conversationId}`);

          // Return typed error response
          return {
            success: false,
            error: 'No user context found',
            suggestion: 'Please provide your name so I can personalize our conversation.',
            conversationId,
          };
        }

        self.#logger.debug(`Retrieved user context: ${context.userName} for conversation ${conversationId}`);

        // Return typed success response
        return {
          success: true,
          name: context.userName,
          timestamp: context.timestamp.toISOString(),
          conversationId,
        };
      },
      {
        name: 'get_user_info',
        description:
          `Get information about the current user for personalized communication.

Call this tool with the conversationId (extract it from the system message marked with [INTERNAL: conversation_id=...]) to retrieve the user's name and personalize your responses.

Returns a structured JSON object with either:
- Success: { success: true, name: string, timestamp: string, conversationId: string }
- Error: { success: false, error: string, suggestion: string, conversationId: string }`,
        schema: GetUserInfoInputSchema,
      },
    );
  }
}
