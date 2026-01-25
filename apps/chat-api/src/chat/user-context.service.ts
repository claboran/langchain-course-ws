import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';

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
   * Get user information for a conversation
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
   * The tool accesses user context from this service based on conversationId
   */
  createUserInfoTool() {
    return tool(
      async ({ conversationId }: { conversationId: string }) => {
        // Retrieve user information from the context map
        const userContext = this.getUserContext(conversationId);

        if (!userContext) {
          return JSON.stringify({
            error: 'No user context found for this conversation',
          });
        }

        return JSON.stringify({
          name: userContext.userName,
          timestamp: userContext.timestamp.toISOString(),
        });
      },
      {
        name: 'get_user_info',
        description:
          "Get information about the current user for personalized communication. Call this tool with the conversationId to access user details.",
        schema: z.object({
          conversationId: z.string().describe('The conversation ID to look up user context'),
        }),
      },
    );
  }
}
