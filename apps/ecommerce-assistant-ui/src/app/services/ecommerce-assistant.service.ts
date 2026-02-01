import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ConversationResponseDto } from '../../server/openapi-client';

/**
 * Service to interact with the E-commerce Assistant API
 *
 * Uses HttpClient to call Analog server routes which proxy to the backend
 */
@Injectable({
  providedIn: 'root',
})
export class EcommerceAssistantService {
  private readonly baseUrl = '/api/v1/ecommerce-assistant';

  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new conversation
   */
  createConversation(request: {
    message: string;
  }): Observable<ConversationResponseDto> {
    return this.http.post<ConversationResponseDto>(this.baseUrl, request);
  }

  /**
   * Continue an existing conversation
   */
  continueConversation(
    conversationId: string,
    request: { message: string },
  ): Observable<ConversationResponseDto> {
    return this.http.put<ConversationResponseDto>(
      `${this.baseUrl}/${conversationId}`,
      request,
    );
  }

  /**
   * Delete a conversation
   */
  deleteConversation(
    conversationId: string,
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${conversationId}`,
    );
  }
}
