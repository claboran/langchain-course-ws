import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { match } from 'ts-pattern';
import { AgentService } from '../langchain/agent.service';
import { ChatChunk, ChatRequest, ToolCall_Status } from '../../generated/chat';
import { AgentEvent, AgentEventType } from '../langchain/agent.state';

/**
 * Streams chat chunks as an Observable, transforming each AgentEvent to a
 * gRPC ChatChunk via the supplied mapping function.
 *
 * A plain function is sufficient here — no state, no lifecycle, no injected
 * dependencies beyond the two arguments the call site already holds.
 */
export const streamChatChunks = (
  agentService: AgentService,
  request: ChatRequest,
  mapEventToChunk: (event: AgentEvent) => ChatChunk,
): Observable<ChatChunk> =>
  agentService
    .streamChat(request.conversationId, request.message, request.metadata)
    .pipe(
      map((event) => mapEventToChunk(event)),
      catchError((error) => { throw error; }),
    );

/** Maps a tool status string to the gRPC ToolCall_Status enum */
export const mapToolStatus = (status: string): ToolCall_Status =>
  match(status?.toUpperCase())
    .with('PENDING',     () => ToolCall_Status.PENDING)
    .with('IN_PROGRESS', () => ToolCall_Status.IN_PROGRESS)
    .with('COMPLETED',   () => ToolCall_Status.COMPLETED)
    .with('FAILED',      () => ToolCall_Status.FAILED)
    .otherwise(          () => ToolCall_Status.PENDING);

/**
 * Maps an AgentEvent to a gRPC ChatChunk.
 * Pass an optional `onUnknown` callback to handle/log unrecognised event types.
 */
export const mapEventToChunk = (
  event: AgentEvent,
  onUnknown?: (type: string) => void,
): ChatChunk => {
  const base: ChatChunk = { isFinal: event.isFinal, sequence: event.sequence };

  return match(event.type)
    .with(AgentEventType.TEXT_CHUNK,  () => ({
      ...base,
      text: { content: event.data.content, role: event.data.role || 'assistant' },
    }))
    .with(AgentEventType.TOOL_CALL,   () => ({
      ...base,
      toolCall: {
        toolId:    event.data.toolId,
        toolName:  event.data.toolName,
        arguments: event.data.arguments,
        status:    mapToolStatus(event.data.status),
      },
    }))
    .with(AgentEventType.TOOL_RESULT, () => ({
      ...base,
      toolResult: {
        toolId:       event.data.toolId,
        toolName:     event.data.toolName,
        result:       event.data.result,
        success:      event.data.success,
        errorMessage: event.data.errorMessage || '',
      },
    }))
    .with(AgentEventType.METADATA,    () => ({
      ...base,
      metadata: {
        conversationId: event.data.conversationId,
        messageCount:   event.data.messageCount,
        hasMarkdown:    event.data.hasMarkdown,
        hasToolCalls:   event.data.hasToolCalls,
        tokenUsage:     event.data.tokenUsage,
        timestamp:      event.data.timestamp,
        model:          event.data.model,
      },
    }))
    .with(AgentEventType.ERROR,       () => ({
      ...base,
      error: {
        code:      event.data.code,
        message:   event.data.message,
        details:   event.data.details || '',
        retryable: event.data.retryable,
      },
    }))
    .with(AgentEventType.INTERRUPT,   () => ({
      ...base,
      interrupt: {
        interruptId:   event.data.interruptId,
        specId:        event.data.specId,
        specTitle:     event.data.specTitle,
        endpointCount: event.data.endpointCount,
        message:       event.data.message,
      },
    }))
    .otherwise(() => {
      onUnknown?.(event.type);
      return base;
    });
};
