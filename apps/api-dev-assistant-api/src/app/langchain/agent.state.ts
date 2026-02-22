import { z } from 'zod';
import { Annotation, messagesStateReducer, MessagesZodState } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

// ---------------------------------------------------------------------------
// Agent event types
// ---------------------------------------------------------------------------

export enum AgentEventType {
  TEXT_CHUNK = 'text_chunk',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  INTERRUPT = 'interrupt',
  METADATA = 'metadata',
  ERROR = 'error',
}

export type AgentEvent = {
  type: AgentEventType;
  data: any;
  sequence: number;
  isFinal: boolean;
};

// ---------------------------------------------------------------------------
// Domain schemas
// ---------------------------------------------------------------------------

/** Value carried by interrupt() when the graph pauses for human review */
export const HitlInterruptSchema = z.object({
  interruptId:   z.string(),
  specId:        z.string(),
  specTitle:     z.string(),
  endpointCount: z.number(),
});
export type HitlInterrupt = z.infer<typeof HitlInterruptSchema>;

/** Feedback received from the client via SendFeedback RPC */
export const HitlFeedbackSchema = z.object({
  interruptId: z.string(),
  action:      z.enum(['approve', 'refine', 'reject']),
  notes:       z.string().optional(),
});
export type HitlFeedback = z.infer<typeof HitlFeedbackSchema>;

// ---------------------------------------------------------------------------
// Graph state schema
// ---------------------------------------------------------------------------

/** The three possible intents the classifier can assign to a message */
export const IntentSchema = z.enum(['api_design', 'refinement', 'general']).nullable();
export type Intent = z.infer<typeof IntentSchema>;

/**
 * Attaches a Zod schema for LangGraph 1.x runtime validation.
 * `schema` is not yet in the TypeScript declarations so we accept it as
 * `unknown` and cast only at the boundary — all other config fields stay
 * fully typed via the generic `T`.
 */
const withZodSchema = <T>(schema: unknown, rest: T): T =>
  ({ schema, ...rest } as unknown as T);

export const ApiAssistantState = Annotation.Root({
  // messages uses the LangGraph managed channel — history is automatically
  // accumulated and de-duplicated across graph steps.
  // MessagesZodState is a LangGraph-internal Zod v3 type; it is attached for
  // runtime serialisation only and must not be mixed into the typed reducer config.
  messages: Annotation<BaseMessage[]>(
    withZodSchema(MessagesZodState, {
      reducer: messagesStateReducer,
      default: (): BaseMessage[] => [],
    }),
  ),
  /** Classified intent of the latest human message */
  intent: Annotation<Intent>(
    withZodSchema(IntentSchema, {
      reducer: (_: Intent, update: Intent) => update,
      default: (): Intent => null,
    }),
  ),
  /** specId of the spec currently being worked on */
  activeSpecId: Annotation<string | null>(
    withZodSchema(z.string().nullable(), {
      reducer: (_: string | null, update: string | null) => update,
      default: (): string | null => null,
    }),
  ),
});

export type ApiAssistantStateType = typeof ApiAssistantState.State;

// ---------------------------------------------------------------------------
// Streaming state
// ---------------------------------------------------------------------------

export type StreamProcessingState = {
  sequence: number;
  hasToolCalls: boolean;
  promptTokens: number;
  completionTokens: number;
  /** IDs of messages already emitted — prevents duplicate events when LangGraph
   *  re-emits the same full state snapshot at multiple node transitions. */
  processedIds: Set<string>;
  /** True once an INTERRUPT event has been emitted — prevents double-emission
   *  from both the stream's __interrupt__ snapshot and the post-stream getState() check. */
  interruptEmitted: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tool name suffixes that trigger a HITL review after execution */
export const SPEC_MODIFYING_SUFFIXES = ['create_openapi_spec', 'add_endpoint'];
