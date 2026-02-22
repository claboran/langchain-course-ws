import { Logger } from '@nestjs/common';
import { Observable, from, defer, concat } from 'rxjs';
import { concatMap, catchError, switchMap } from 'rxjs/operators';
import {
  AgentEvent,
  AgentEventType,
  ApiAssistantStateType,
  HitlInterrupt,
  StreamProcessingState,
} from './agent.state';
import { msgType } from './agent.util';
import { buildInterruptEvent } from './agent-graph.util';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const makeStreamProcessingState = (): StreamProcessingState => ({
  sequence: 0,
  hasToolCalls: false,
  promptTokens: 0,
  completionTokens: 0,
  processedIds: new Set(),
  interruptEmitted: false,
});

// ---------------------------------------------------------------------------
// State snapshot → AgentEvents
// Each function handles one message role and returns zero or more events.
// ---------------------------------------------------------------------------

const eventsFromInterrupts = (
  state: ApiAssistantStateType,
  shared: StreamProcessingState,
): AgentEvent[] | null => {
  const rawInterrupts: unknown[] = (state as any).__interrupt__;
  if (!rawInterrupts?.length) return null;

  shared.interruptEmitted = true;

  return rawInterrupts.reduce<AgentEvent[]>((acc, raw) => {
    const event = buildInterruptEvent((raw as any).value as HitlInterrupt, shared.sequence);
    if (!event) return acc;
    shared.sequence++;
    return [...acc, event];
  }, []);
};

const eventsFromAiMessage = (
  last: any,
  shared: StreamProcessingState,
): AgentEvent[] => {
  if (msgType(last) !== 'ai' || !last.content) return [];

  if (last.usage_metadata) {
    shared.promptTokens  += last.usage_metadata.input_tokens  ?? 0;
    shared.completionTokens += last.usage_metadata.output_tokens ?? 0;
  }

  return [{
    type: AgentEventType.TEXT_CHUNK,
    data: { content: last.content, role: 'assistant' },
    sequence: shared.sequence++,
    isFinal: false,
  }];
};

const eventsFromToolCalls = (
  last: any,
  shared: StreamProcessingState,
): AgentEvent[] => {
  if (!last.tool_calls?.length) return [];

  shared.hasToolCalls = true;

  const toolCalls: any[] = last.tool_calls;
  return toolCalls.reduce((acc: AgentEvent[], tc: any) => [
    ...acc,
    {
      type: AgentEventType.TOOL_CALL,
      data: {
        toolId:    tc.id ?? `tool_${shared.sequence}`,
        toolName:  tc.name,
        arguments: JSON.stringify(tc.args),
        status:    'IN_PROGRESS',
      },
      sequence: shared.sequence++,
      isFinal: false,
    },
  ], []);
};

const eventsFromToolResult = (
  last: any,
  shared: StreamProcessingState,
): AgentEvent[] => {
  if (msgType(last) !== 'tool') return [];

  return [{
    type: AgentEventType.TOOL_RESULT,
    data: {
      toolId:   last.tool_call_id ?? `tool_${shared.sequence}`,
      toolName: last.name ?? 'unknown',
      result:   last.content,
      success:  true,
    },
    sequence: shared.sequence++,
    isFinal: false,
  }];
};

// ---------------------------------------------------------------------------
// Full snapshot processor
// ---------------------------------------------------------------------------

export const processStateSnapshot = (
  state: ApiAssistantStateType,
  shared: StreamProcessingState,
): AgentEvent[] => {
  // LangGraph 1.x surfaces interrupts as a special { __interrupt__: [...] } snapshot
  const interruptEvents = eventsFromInterrupts(state, shared);
  if (interruptEvents) return interruptEvents;

  const messages = state.messages ?? [];
  const last = messages.at(-1) as any;
  if (!last || typeof last._getType !== 'function') return [];

  // Stable deduplication: prefer message's own id, fall back to tool_call_id
  const msgId: string = last.id ?? last.tool_call_id ?? '';
  if (msgId && shared.processedIds.has(msgId)) return [];
  if (msgId) shared.processedIds.add(msgId);

  return [
    ...eventsFromAiMessage(last, shared),
    ...eventsFromToolCalls(last, shared),
    ...eventsFromToolResult(last, shared),
  ];
};

// ---------------------------------------------------------------------------
// Post-stream: pending HITL interrupts + metadata event
// ---------------------------------------------------------------------------

export const pendingInterruptEvents = async (
  graph: any,
  config: any,
  shared: StreamProcessingState,
  logger: Logger,
): Promise<AgentEvent[]> => {
  if (shared.interruptEmitted) return [];

  try {
    const graphState = await graph.getState(config);
    const interrupts: HitlInterrupt[] = (graphState?.tasks ?? []).flatMap(
      (task: any) => (task.interrupts ?? []).map((i: any) => i.value as HitlInterrupt),
    );

    return interrupts.reduce<AgentEvent[]>((acc, iv) => {
      const event = buildInterruptEvent(iv, shared.sequence);
      if (!event) return acc;
      shared.sequence++;
      return [...acc, event];
    }, []);
  } catch (err) {
    logger.warn('Could not inspect graph state for interrupts', err);
    return [];
  }
};

export const metadataEvent = (
  conversationId: string,
  messageCount: number,
  modelName: string,
  shared: StreamProcessingState,
): AgentEvent => ({
  type: AgentEventType.METADATA,
  data: {
    conversationId,
    messageCount,
    hasMarkdown: true,
    hasToolCalls: shared.hasToolCalls,
    tokenUsage: {
      promptTokens:     shared.promptTokens,
      completionTokens: shared.completionTokens,
      totalTokens:      shared.promptTokens + shared.completionTokens,
      estimatedCost:    0,
    },
    timestamp: new Date().toISOString(),
    model: modelName,
  },
  sequence: shared.sequence++,
  isFinal: true,
});

export const errorEvent = (error: any, shared: StreamProcessingState): AgentEvent => ({
  type: AgentEventType.ERROR,
  data: {
    code:      'AGENT_ERROR',
    message:   error.message ?? 'An error occurred while processing your request',
    details:   JSON.stringify(error),
    retryable: false,
  },
  sequence: shared.sequence++,
  isFinal: true,
});

// ---------------------------------------------------------------------------
// Pipeline assembly
// Combines the stream$, error handling, and post-stream$ into one Observable.
// ---------------------------------------------------------------------------

export type PostStreamDeps = {
  graph: any;
  config: any;
  conversationId: string;
  modelName: string;
  getMessageCount: (conversationId: string) => Promise<number>;
  logger: Logger;
};

export const buildGraphStream = (
  input: any,
  config: any,
  shared: StreamProcessingState,
  deps: PostStreamDeps,
): Observable<AgentEvent> => {
  const streamEvents$ = defer(() => deps.graph.stream(input, config)).pipe(
    switchMap((stream) => from(stream as AsyncIterable<ApiAssistantStateType>)),
    concatMap((state) => processStateSnapshot(state, shared)),
    catchError((error) => {
      deps.logger.error(`Stream error for ${deps.conversationId}`, error);
      return from<AgentEvent[]>([errorEvent(error, shared)]);
    }),
  );

  const postStream$ = defer(async () => {
    const interrupts = await pendingInterruptEvents(deps.graph, config, shared, deps.logger);
    const count      = await deps.getMessageCount(deps.conversationId);
    const meta       = metadataEvent(deps.conversationId, count, deps.modelName, shared);
    return [...interrupts, meta];
  }).pipe(concatMap((events) => from(events)));

  return concat(streamEvents$, postStream$);
};
