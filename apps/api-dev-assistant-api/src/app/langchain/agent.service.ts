import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ChatMistralAI } from '@langchain/mistralai';
import { CHAT_MISTRAL_AI } from '@langchain-course-ws/model-provider';
import { HumanMessage } from '@langchain/core/messages';
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
import { buildSystemPrompt } from './agent.util';
import {
  afterHumanReview,
  makeAfterToolsNode,
  makeCallModelNode,
  makeClassifyNode,
  makeHumanReviewNode,
  shouldAfterTools,
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

    const systemPrompt = buildSystemPrompt(tools);

    // Default: model may choose whether to call tools (general queries)
    const defaultModel = tools.length > 0
      ? this.model.bindTools(tools)
      : this.model;
    // Forced: Mistral must call at least one tool (api_design / refinement intent)
    const forcedModel =
      tools.length > 0 ?
        this.model.bindTools(tools, { tool_choice: 'any' } as any)
        : this.model;

    // ----- nodes -----
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
    const workflow = new StateGraph(ApiAssistantState)
      .addNode('classify',     classify)
      .addNode('agent',        callModel)
      .addNode('tools',        toolNode)
      .addNode('after_tools',  afterTools)
      .addNode('human_review', humanReview)
      .addEdge(START, 'classify')
      .addEdge('classify', 'agent')
      .addConditionalEdges('agent',        shouldContinue,   ['tools', END])
      .addEdge('tools', 'after_tools')
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
  // Conversation management
  // ---------------------------------------------------------------------------

  startConversation(): string {
    return crypto.randomUUID();
  }

  async deleteConversation(conversationId: string): Promise<number> {
    return this.checkpointerService.deleteConversation(conversationId);
  }
}
