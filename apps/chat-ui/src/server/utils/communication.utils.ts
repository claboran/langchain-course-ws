import {
  NewChatRequest,
  ContinueChatRequest,
  ChatResponse,
} from '../../shared';
import {
  ChatApi,
  NewChatRequestDto,
  ContinueChatRequestDto,
  ChatResponseDto,
  Configuration,
} from '../openapi-client';
import {
  safeParseOrThrow,
  validateConversationIdOrThrow as baseValidateConversationIdOrThrow,
  callWithErrorHandling,
} from '@langchain-course-ws/communication';
import { ConversationIdSchema } from '../../shared';

const CHAT_API_URL = process.env['CHAT_API_URL'] || 'http://localhost:3311';
const config = new Configuration({ basePath: CHAT_API_URL });
export const chatApiClient = new ChatApi(config);

export const transformNewChatRequestToDto = (
  req: NewChatRequest,
): NewChatRequestDto => ({
  message: req.message,
  user: req.user,
});

export const transformContinueChatRequestToDto = (
  req: ContinueChatRequest,
): ContinueChatRequestDto => ({
  message: req.message,
  user: req.user,
});

export const transformChatResponseFromDto = (
  dto: ChatResponseDto,
): ChatResponse => ({
  message: dto.message,
  conversationId: dto.conversationId,
  confidence: dto.confidence,
  hasMarkdown: dto.hasMarkdown,
});

/**
 * Validate conversation ID as UUID
 */
export const validateConversationIdOrThrow = (
  conversationId: unknown,
  opts?: { paramName?: string },
): string =>
  baseValidateConversationIdOrThrow(conversationId, ConversationIdSchema, opts);

export { safeParseOrThrow, callWithErrorHandling };
