import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ChatRequest, ChatResponse } from '../../shared';

/**
 * Chat API Service
 *
 * Handles HTTP communication with the chat API endpoint.
 * This service is injected into the ChatStore for making API calls.
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/chat';

  /**
   * Send a chat message to the API
   *
   * @param request - Chat request containing message, user, and conversationId
   * @returns Observable of the chat response
   */
  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}
