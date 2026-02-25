import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, START, END, Command } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MCPClientService } from '../mcp/mcp-client.service';
import { CheckpointerService } from './checkpointer.service';
import { Observable } from 'rxjs';
import {
  AgentEvent,
  ApiAssistantState,
  HitlFeedback,
} from './agent.state';
import { buildClarificationSystemPrompt, buildSystemPrompt } from './agent.util';
import { msgType } from './agent.util';
import {
  afterHumanReview,
  makeAfterToolsNode,
  makeCallModelNode,
  makeClarifyNode,
  makeClassifyNode,
  makeHumanReviewNode,
  routeAfterTools,
  routeByPhase,
  shouldAfterTools,
  shouldClarifyTools,
  shouldContinue,
} from './agent-graph.util';
import {
  buildGraphStream,
  makeStreamProcessingState,
} from './agent-pipeline.util';


@Injectable()
export class AgentService implements OnApplicationBootstrap {
  readonly #logger = new Logger(AgentService.name);
  #graph: any;

  constructor(
    @Inject(CHAT_MISTRAL_AI) private readonly model: ChatMistralAI,
    private readonly mcpClientService: MCPClientService,
    private readonly checkpointerService: CheckpointerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.#graph = this.createAgent();
    this.#logger.log('LangGraph agent compiled and ready');
  }


  // ---------------------------------------------------------------------------
  // Graph construction
  // ---------------------------------------------------------------------------

  private createAgent() {
    const tools = this.mcpClientService.getLangChainTools();

    if (tools.length === 0) {
      this.#logger.warn('No MCP tools available — agent will have limited capabilities');
    } else {
      this.#logger.log(`Agent initialized with ${tools.length} MCP tools`);
    }

    const clarificationSystemPrompt = buildClarificationSystemPrompt(tools);
    const systemPrompt = buildSystemPrompt(tools);

    // Default: model may choose whether to call tools (general queries + clarification)
    const defaultModel = tools.length > 0
      ? this.model.bindTools(tools)
      : this.model;
    // Forced: Mistral must call at least one tool (api_design / refinement intent)
    const forcedModel =
      tools.length > 0 ?
        this.model.bindTools(tools, { tool_choice: 'any' } as any)
        : this.model;

    // ----- nodes -----
    const clarify     = makeClarifyNode(clarificationSystemPrompt, defaultModel);
    const classify    = makeClassifyNode();
    const callModel = makeCallModelNode(
      systemPrompt,
      defaultModel,
      forcedModel,
      tools,
    );
    const afterTools  = makeAfterToolsNode();
    const humanReview = makeHumanReviewNode();
    const toolNode    = new ToolNode(tools);

    // ----- graph -----
    // Phase 1 (clarification): START → clarify → [tools → clarify]* → END
    // Phase 2 (api_design):    START → classify → agent → [tools → after_tools → ...]* → END
    const workflow = new StateGraph(ApiAssistantState)
      .addNode('clarify',      clarify)
      .addNode('classify',     classify)
      .addNode('agent',        callModel)
      .addNode('tools',        toolNode)
      .addNode('after_tools',  afterTools)
      .addNode('human_review', humanReview)
      .addConditionalEdges(START,          routeByPhase,     ['clarify', 'classify'])
      .addConditionalEdges('clarify',      shouldClarifyTools, ['tools', END])
      .addEdge('classify', 'agent')
      .addConditionalEdges('agent',        shouldContinue,   ['tools', END])
      .addConditionalEdges('tools',        routeAfterTools,  ['clarify', 'after_tools'])
      .addConditionalEdges('after_tools',  shouldAfterTools, ['human_review', 'agent'])
      .addConditionalEdges('human_review', afterHumanReview, ['agent', END]);

    return workflow.compile({ checkpointer: this.checkpointerService.getCheckpointer() });
  }

  // ---------------------------------------------------------------------------
  // Streaming
  // ---------------------------------------------------------------------------

  /**
   * Stream a new chat turn.
   * After the main stream completes, inspects graph state for pending HITL interrupts
   * and emits an INTERRUPT event if one is found, followed by the final METADATA event.
   */
  streamChat(
    conversationId: string,
    message: string,
    metadata?: Record<string, string>
  ): Observable<AgentEvent> {
    const input = { messages: [new HumanMessage(message)] };
    return this.runGraphStream(conversationId, input);
  }

  /**
   * Resume a graph that was paused at a human_review node.
   * Passes the human's feedback via LangGraph Command({ resume }) and streams
   * the resulting output back to the client.
   */
  resumeWithFeedback(
    conversationId: string,
    feedback: HitlFeedback
  ): Observable<AgentEvent> {
    return this.runGraphStream(conversationId, new Command({ resume: feedback }));
  }

  /**
   * Core streaming pipeline shared by streamChat and resumeWithFeedback.
   */
  private runGraphStream(conversationId: string, input: any): Observable<AgentEvent> {
    const config = {
      configurable: { thread_id: conversationId },
      streamMode: 'values' as const,
    };

    return buildGraphStream(input, config, makeStreamProcessingState(), {
      graph:           this.#graph,
      config,
      conversationId,
      modelName:       this.model.model,
      getMessageCount: (id) => this.checkpointerService.getMessageCount(id),
      logger:          this.#logger,
    });
  }

  // ---------------------------------------------------------------------------
  // Clarification phase (unary, non-streaming)
  // ---------------------------------------------------------------------------

  /**
   * Single clarification turn: add the user message, run the graph to END,
   * and return the last AI response as plain text.
   */
  async clarifyChat(conversationId: string, message: string): Promise<{ content: string }> {
    const input = { messages: [new HumanMessage(message)] };
    const config = { configurable: { thread_id: conversationId } };
    const result = await this.#graph.invoke(input, config);

    const messages: any[] = result.messages ?? [];
    const lastAi = [...messages].reverse().find((m) => msgType(m) === 'ai');
    const content = typeof lastAi?.content === 'string' ? lastAi.content : '';

    return { content };
  }

  /**
   * Phase transition: generate a requirements summary from the clarification
   * conversation, then flip phase to 'api_design' in the graph state.
   * Returns the generated summary so the client can display it.
   */
  async transitionToApiPhase(conversationId: string): Promise<{ summary: string }> {
    const config = { configurable: { thread_id: conversationId } };
    const currentState = await this.#graph.getState(config);
    const messages: any[] = currentState.values?.messages ?? [];

    let summary = '';
    if (messages.length > 0) {
      const summaryResponse = await this.model.invoke([
        new SystemMessage(
          'You are an API requirements analyst. Based on the conversation below, ' +
          'produce a structured requirements document in markdown. ' +
          'Include sections for: API Purpose, Resources & Entities, Authentication, ' +
          'High-level Endpoints, Validation Rules, and Edge Cases.',
        ),
        ...messages,
        new HumanMessage(
          'Please summarise the API requirements from our discussion as a concise, ' +
          'structured markdown document that will ground the implementation phase.',
        ),
      ]);
      summary = typeof summaryResponse.content === 'string' ? summaryResponse.content : '';
    }

    await this.#graph.updateState(config, {
      phase: 'api_design' as const,
      clarificationSummary: summary,
    });

    this.#logger.log(`TransitionToApiPhase - conversationId: ${conversationId}, summaryLength: ${summary.length}`);
    return { summary };
  }

  // ---------------------------------------------------------------------------
  // Conversation management
  // ---------------------------------------------------------------------------

  startConversation(): string {
    return crypto.randomUUID();
  }

  async deleteConversation(conversationId: string): Promise<number> {
    return this.checkpointerService.deleteConversation(conversationId);
  }
}
