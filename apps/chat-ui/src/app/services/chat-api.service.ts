import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { NewChatRequest, ContinueChatRequest, ChatResponse } from '../../shared';

/**
 * Chat API Service
 *
 * Handles HTTP communication with the chat API endpoints.
 * This service is injected into the ChatStore for making API calls.
 *
 * API Structure:
 * - POST /api/v1/chat - Start a new conversation
 * - PUT /api/v1/chat/:conversationId - Continue existing conversation
 * - DELETE /api/v1/chat/:conversationId - Remove conversation
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/chat';

  /**
   * Start a new conversation
   *
   * @param request - New chat request containing message and user
   * @returns Observable of the chat response (includes new conversationId)
   */
  startNewConversation(request: NewChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }

  /**
   * Continue an existing conversation
   *
   * @param conversationId - UUID of the conversation to continue
   * @param request - Continue chat request containing message and user
   * @returns Observable of the chat response
   */
  continueConversation(
    conversationId: string,
    request: ContinueChatRequest
  ): Observable<ChatResponse> {
    return this.http.put<ChatResponse>(`${this.apiUrl}/${conversationId}`, request);
  }

  /**
   * Remove a conversation
   *
   * @param conversationId - UUID of the conversation to remove
   * @returns Observable of the removal confirmation
   */
  removeConversation(conversationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${conversationId}`);
  }
}
