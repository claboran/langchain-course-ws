import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentService } from '../langchain/agent.service';
import { mapEventToChunk, streamChatChunks } from './chat-stream.util';
import {
  ChatRequest,
  ChatChunk,
  DeleteRequest,
  DeleteResponse,
  FeedbackRequest,
  StartConversationRequest,
  StartConversationResponse,
} from '../../generated/chat';

/**
 * gRPC Chat Controller
 * Implements ChatService from proto definition
 */
@Controller()
export class ChatController {
  readonly #logger = new Logger(ChatController.name);

  // shorthand so every call site can pass the same onUnknown callback
  readonly #onUnknownEvent = (type: string) =>
    this.#logger.warn(`Unknown event type: ${type}`);

  constructor(private readonly agentService: AgentService) {}

  /**
   * Create a new conversation with a backend-generated ID
   * Implements unary RPC
   */
  @GrpcMethod('ChatService', 'StartConversation')
  startConversation(_request: StartConversationRequest): StartConversationResponse {
    const conversationId = this.agentService.startConversation();
    this.#logger.log(`StartConversation - generated conversationId: ${conversationId}`);
    return { conversationId };
  }

  /**
   * Stream chat responses
   * Implements server-side streaming RPC
   */
  @GrpcMethod('ChatService', 'StreamChat')
  streamChat(request: ChatRequest): Observable<ChatChunk> {
    this.#logger.log(
      `StreamChat request - conversationId: ${request.conversationId}, message: ${request.message.substring(0, 50)}...`
    );

    return streamChatChunks(
      this.agentService,
      request,
      (event) => mapEventToChunk(event, this.#onUnknownEvent),
    );
  }

  /**
   * Resume a graph paused at a HITL interrupt node.
   * Implements server-side streaming RPC (resumed graph may produce streaming output).
   */
  @GrpcMethod('ChatService', 'SendFeedback')
  sendFeedback(request: FeedbackRequest): Observable<ChatChunk> {
    this.#logger.log(
      `SendFeedback request - conversationId: ${request.conversationId}, action: ${request.action}`
    );

    return this.agentService
      .resumeWithFeedback(request.conversationId, {
        interruptId: request.interruptId,
        action: request.action as 'approve' | 'refine' | 'reject',
        notes: request.notes || undefined,
      })
      .pipe(map((event) => mapEventToChunk(event, this.#onUnknownEvent)));
  }

  /**
   * Delete a conversation
   * Implements unary RPC
   */
  @GrpcMethod('ChatService', 'DeleteConversation')
  async deleteConversation(request: DeleteRequest): Promise<DeleteResponse> {
    this.#logger.log(`DeleteConversation request - conversationId: ${request.conversationId}`);

    try {
      const messagesDeleted = await this.agentService.deleteConversation(
        request.conversationId,
      );

      return {
        message: `Conversation ${request.conversationId} deleted successfully`,
        messagesDeleted,
      };
    } catch (error) {
      this.#logger.error(`Error deleting conversation ${request.conversationId}`, error);
      throw error;
    }
  }
}
