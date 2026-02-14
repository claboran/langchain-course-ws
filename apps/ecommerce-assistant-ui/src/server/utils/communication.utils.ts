import {
  EcommerceAssistantApi,
  Configuration,
} from '../openapi-client';
import {
  safeParseOrThrow,
  validateConversationIdOrThrow as baseValidateConversationIdOrThrow,
  callWithErrorHandling,
} from '@langchain-course-ws/communication';
import { ConversationIdSchema } from '../../shared/ecommerce.schema';

const ECOMMERCE_API_URL =
  process.env['ECOMMERCE_API_URL'] || 'http://localhost:3312';
const config = new Configuration({ basePath: ECOMMERCE_API_URL });
export const ecommerceApiClient = new EcommerceAssistantApi(config);

/**
 * Validate conversation ID as UUID
 */
export const validateConversationIdOrThrow = (
  conversationId: unknown,
  opts?: { paramName?: string },
): string =>
  baseValidateConversationIdOrThrow(conversationId, ConversationIdSchema, opts);

export { safeParseOrThrow, callWithErrorHandling };
