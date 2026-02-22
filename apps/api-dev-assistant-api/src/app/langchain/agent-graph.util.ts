import { match } from 'ts-pattern';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { END, interrupt } from '@langchain/langgraph';
import {
  AgentEvent,
  AgentEventType,
  ApiAssistantStateType,
  HitlFeedback,
  HitlInterrupt,
  SPEC_MODIFYING_SUFFIXES,
} from './agent.state';
import { classifyIntent, extractEndpointCount, extractSpecId, extractSpecTitle, msgType } from './agent.util';

// ---------------------------------------------------------------------------
// Node factories
// Each factory receives the dependencies it needs and returns the node function.
// ---------------------------------------------------------------------------

/** Classify the intent of the latest human message */
export const makeClassifyNode =
  () =>
  async (state: ApiAssistantStateType): Promise<Partial<ApiAssistantStateType>> => {
    const lastHuman = [...state.messages].reverse().find((m) => msgType(m) === 'human');
    const content = typeof lastHuman?.content === 'string' ? lastHuman.content : '';
    return { intent: classifyIntent(content) };
  };

/** Invoke the LLM with the current message history */
export const makeCallModelNode =
  (systemPrompt: string, defaultModel: any, forcedModel: any, tools: any[]) =>
  async (state: ApiAssistantStateType): Promise<Partial<ApiAssistantStateType>> => {
    const hasSystem = state.messages.length > 0 && msgType(state.messages[0]) === 'system';
    const messagesWithSystem = hasSystem
      ? state.messages
      : [new SystemMessage(systemPrompt), ...state.messages];

    // Force tool usage for api_design / refinement intents; let the model decide for general queries
    const model =
      tools.length > 0 && state.intent !== 'general' ? forcedModel : defaultModel;

    const response = await model.invoke(messagesWithSystem);
    return { messages: [response] };
  };

/** After tools run: detect spec-modifying tool results and update activeSpecId */
export const makeAfterToolsNode =
  () =>
  async (state: ApiAssistantStateType): Promise<Partial<ApiAssistantStateType>> => {
    const toolMessages = state.messages.filter((m) => msgType(m) === 'tool');
    const lastTool = toolMessages.at(-1) as any;

    if (!lastTool) return {};

    const toolName: string = lastTool.name ?? '';
    const isSpecModifying = SPEC_MODIFYING_SUFFIXES.some((s) => toolName.endsWith(s));

    if (!isSpecModifying) return {};

    const specId = extractSpecId(lastTool.content as string);
    return specId ? { activeSpecId: specId } : {};
  };

/** Pause graph and request human review of the generated spec (HITL) */
export const makeHumanReviewNode =
  () =>
  async (state: ApiAssistantStateType): Promise<Partial<ApiAssistantStateType>> => {
    const specId = state.activeSpecId;
    if (!specId) return {};

    // Find the last spec-modifying tool result to extract metadata
    const lastSpecResult = [...state.messages]
      .reverse()
      .find(
        (m) =>
          msgType(m) === 'tool' &&
          SPEC_MODIFYING_SUFFIXES.some((s) => ((m as any).name ?? '').endsWith(s)),
      ) as any;

    const content = (lastSpecResult?.content as string) ?? '{}';
    const interruptValue: HitlInterrupt = {
      interruptId: crypto.randomUUID(),
      specId,
      specTitle: extractSpecTitle(content),
      endpointCount: extractEndpointCount(content),
    };

    // Pause graph — execution resumes when SendFeedback is called with Command({ resume })
    const feedback = interrupt(interruptValue) as HitlFeedback;

    return match(feedback)
      .with({ action: 'approve' }, () => ({
        messages: [
          new AIMessage(
            `✅ The OpenAPI specification **${interruptValue.specTitle}** has been approved (ID: \`${specId}\`). You can now use it to generate client code or export it.`,
          ),
        ],
        activeSpecId: null,
      }))
      .with({ action: 'refine' }, ({ notes }) => ({
        messages: [
          new HumanMessage(
            `Please refine the OpenAPI specification for "${interruptValue.specTitle}" (ID: ${specId}) with these changes: ${notes}`,
          ),
        ],
      }))
      .with({ action: 'reject' }, () => ({
        messages: [
          new AIMessage(`🗑️ The specification has been discarded. What would you like to design instead?`),
        ],
        activeSpecId: null,
      }))
      .exhaustive();
  };

// ---------------------------------------------------------------------------
// Routing functions
// ---------------------------------------------------------------------------

/** Route after the agent node: call tools or end */
export const shouldContinue = (state: ApiAssistantStateType): 'tools' | typeof END => {
  const last = state.messages.at(-1) as AIMessage;
  return last?.tool_calls && last.tool_calls.length > 0 ? 'tools' : END;
};

/** Route after tools: human review if a spec was modified, otherwise back to agent */
export const shouldAfterTools = (state: ApiAssistantStateType): 'human_review' | 'agent' =>
  state.activeSpecId ? 'human_review' : 'agent';

/** Route after human review: loop back to agent for refinement, otherwise end */
export const afterHumanReview = (state: ApiAssistantStateType): 'agent' | typeof END =>
  msgType(state.messages.at(-1)) === 'human' ? 'agent' : END;

// ---------------------------------------------------------------------------
// Interrupt event builder
// ---------------------------------------------------------------------------

/**
 * Converts a raw LangGraph interrupt value into an INTERRUPT AgentEvent.
 * Returns null when the value is not a valid HitlInterrupt.
 */
export const buildInterruptEvent = (
  iv: HitlInterrupt,
  sequence: number,
): AgentEvent | null => {
  if (!iv?.interruptId) return null;

  return {
    type: AgentEventType.INTERRUPT,
    data: {
      interruptId: iv.interruptId,
      specId: iv.specId,
      specTitle: iv.specTitle,
      endpointCount: iv.endpointCount,
      message: `Please review the generated OpenAPI specification "${iv.specTitle}". Approve to keep it, refine with specific feedback, or reject to discard it.`,
    },
    sequence,
    isFinal: false,
  };
};

