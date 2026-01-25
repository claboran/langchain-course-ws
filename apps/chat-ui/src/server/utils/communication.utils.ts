import { NewChatRequest, ContinueChatRequest, ChatResponse } from '../../shared';
import {
  ChatApi,
  NewChatRequestDto,
  ContinueChatRequestDto,
  ChatResponseDto,
  Configuration,
} from '../openapi-client';
import { createError } from 'h3';
import { z } from 'zod';
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

export const safeParseOrThrow = <S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  opts?: { statusCode?: number; statusMessage?: string; message?: string },
): z.infer<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw createError({
      statusCode: opts?.statusCode ?? 400,
      statusMessage: opts?.statusMessage ?? 'Validation Error',
      data: {
        message: opts?.message ?? 'Validation failed',
        errors: z.treeifyError(result.error),
      },
    });
  }

  return result.data;
};

export const validateConversationIdOrThrow = (
  conversationId: unknown,
  opts?: { paramName?: string },
): string =>
  safeParseOrThrow(ConversationIdSchema, conversationId, {
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: `${opts?.paramName ?? 'conversationId'} must be a valid UUID`,
  });

export const callWithErrorHandling = async <T>(
  fn: () => Promise<T>,
  name?: string,
): Promise<T> => {
  try {
    return await fn();
  } catch (e: any) {
    const friendly = name || 'API';
    // If the generated client includes a response (Response object), extract details
    if (e && e.response) {
      const status =
        e.response && typeof e.response.status === 'number'
          ? e.response.status
          : 500;
      const statusText = e.response.statusText || `${friendly} Error`;
      // attempt to read body text if available
      let errorText: string;
      try {
        errorText = e.response.text ? await e.response.text() : String(e);
      } catch (readErr) {
        errorText = String(e);
      }
      console.error(`${friendly} Error:`, {
        status,
        statusText,
        body: errorText,
      });

      throw createError({
        statusCode: status,
        statusMessage: `${friendly} Error`,
        data: {
          message: `Failed to get response from ${friendly}`,
          details: statusText,
        },
      });
    }

    // Unexpected error (not a ResponseError)
    console.error(`Unexpected error calling ${friendly}:`, e);
    throw createError({
      statusCode: 500,
      statusMessage: `${friendly} Error`,
      data: {
        message: `Failed to get response from ${friendly}`,
      },
    });
  }
};
