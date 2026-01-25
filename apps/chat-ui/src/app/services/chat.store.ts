import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap } from 'rxjs';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { ChatApiService } from './chat-api.service';
import { ChatMessage as LibraryChatMessage } from '@langchain-course-ws/chat-components';
import type { NewChatRequest, ContinueChatRequest } from '../../shared';

/**
 * Store Chat Message Type
 * Extends the library's ChatMessage with store-specific tracking field
 */
export type ChatMessage = LibraryChatMessage & {
  id: string; // Unique identifier for optimistic update rollback
};

/**
 * Chat Store State
 */
export type ChatState = {
  messages: ChatMessage[];
  conversationId: string | null; // Backend-controlled conversation identifier
  userName: string;
  isSending: boolean;
  error: string | null;
};

/**
 * Initial State
 */
const initialState: ChatState = {
  messages: [],
  conversationId: null,
  userName: 'User',
  isSending: false,
  error: null,
};

/**
 * Chat Store
 *
 * Manages chat conversation state including:
 * - Conversation messages
 * - User information
 * - Loading states
 * - Error handling
 *
 * Usage:
 * ```typescript
 * readonly chatStore = inject(ChatStore);
 *
 * // Send a message
 * this.chatStore.sendMessage('Hello!');
 *
 * // Access state
 * messages = this.chatStore.messages;
 * isSending = this.chatStore.isSending;
 * ```
 */
export const ChatStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  // Layer 1: Inject dependencies
  withProps(() => ({
    chatApi: inject(ChatApiService),
  })),

  // Layer 2: Computed values (derived state)
  withComputed((store) => ({
    /**
     * Check if there are any messages
     */
    hasMessages: computed(() => store.messages().length > 0),

    /**
     * Get the last message in the conversation
     */
    lastMessage: computed(() => {
      const messages = store.messages();
      return messages.length > 0 ? messages[messages.length - 1] : null;
    }),

    /**
     * Check if there's an active conversation
     */
    hasActiveConversation: computed(() => store.conversationId() !== null),

    /**
     * Get conversation summary
     */
    conversationSummary: computed(() => ({
      messageCount: store.messages().length,
      conversationId: store.conversationId(),
      userName: store.userName(),
      hasError: store.error() !== null,
    })),
  })),

  // Layer 3: Basic synchronous methods
  withMethods((store) => ({
    /**
     * Set the user name
     */
    setUserName(userName: string) {
      patchState(
        store,
        produce((state: ChatState) => {
          state.userName = userName;
        }),
      );
    },

    /**
     * Clear error state
     */
    clearError() {
      patchState(
        store,
        produce((state: ChatState) => {
          state.error = null;
        }),
      );
    },

    /**
     * Start a new conversation
     * Clears all messages and conversationId (backend will create new one on first message)
     */
    startNewConversation() {
      patchState(
        store,
        produce((state: ChatState) => {
          state.messages = [];
          state.conversationId = null;
          state.error = null;
        }),
      );
    },

    /**
     * Reset the entire chat state
     */
    reset() {
      patchState(store, initialState);
    },

    /**
     * Add a user message to the conversation (optimistic update)
     *
     * @param content - Message content
     * @returns The generated message ID
     */
    addUserMessage(content: string): string {
      const messageId = uuidv4();
      patchState(
        store,
        produce((state: ChatState) => {
          state.messages.push({
            id: messageId,
            type: 'user',
            content,
            timestamp: new Date(),
          });
        }),
      );
      return messageId;
    },

    /**
     * Add an assistant message to the conversation
     *
     * @param content - Message content
     * @param isMarkdown - Whether the content contains markdown
     * @param confidence - AI confidence score (0-1)
     */
    addAssistantMessage(
      content: string,
      isMarkdown = true,
      confidence?: number
    ) {
      patchState(
        store,
        produce((state: ChatState) => {
          state.messages.push({
            id: uuidv4(),
            type: 'assistant',
            content,
            timestamp: new Date(),
            isMarkdown,
            confidence,
          });
        }),
      );
    },

    /**
     * Remove a message (used for rollback on error)
     */
    removeMessage(messageId: string) {
      patchState(
        store,
        produce((state: ChatState) => {
          state.messages = state.messages.filter(
            (m: { id: string }) => m.id !== messageId,
          );
        }),
      );
    },
  })),

  // Layer 4: Async operations with rxMethod
  withMethods((store) => ({
    /**
     * Send a message to the chat API
     *
     * This method:
     * 1. Determines if this is a new or continuing conversation
     * 2. Adds user message optimistically
     * 3. Sends request to appropriate API endpoint
     * 4. Updates conversationId from backend and adds assistant response
     * 5. Rolls back on error
     *
     * @param message - The message content to send
     */
    sendMessage: rxMethod<string>(
      pipe(
        tap(() => {
          // Clear any previous errors and set loading state
          patchState(
            store,
            produce((state: ChatState) => {
              state.error = null;
              state.isSending = true;
            }),
          );
        }),
        switchMap((message) => {
          const currentConversationId = store.conversationId();
          const isNewConversation = !currentConversationId;

          // Optimistically add user message
          const userMessageId = store.addUserMessage(message);

          // Prepare request (same structure for both endpoints)
          const request = {
            message,
            user: store.userName(),
          };

          // Choose API endpoint based on conversation state
          const apiCall = isNewConversation
            ? store.chatApi.startNewConversation(request as NewChatRequest)
            : store.chatApi.continueConversation(currentConversationId!, request as ContinueChatRequest);

          // Send to API
          return apiCall.pipe(
            tapResponse({
              next: (response) => {
                // Pre-process markdown content to fix line breaks
                const processedContent = response.message.replace(
                  /\n(?!\n)/g,
                  '\n\n',
                );

                patchState(
                  store,
                  produce((state: ChatState) => {
                    // Update conversationId from backend (important for new conversations)
                    state.conversationId = response.conversationId;

                    // Add assistant response with all metadata
                    state.messages.push({
                      id: uuidv4(),
                      type: 'assistant',
                      content: processedContent,
                      timestamp: new Date(),
                      isMarkdown: response.hasMarkdown,
                      confidence: response.confidence,
                    } as ChatMessage);
                    state.isSending = false;
                  }),
                );
              },
              error: (error: Error) => {
                // Rollback: remove optimistic user message
                store.removeMessage(userMessageId);

                // Set error state
                patchState(
                  store,
                  produce((state: ChatState) => {
                    state.error =
                      error.message ||
                      'Failed to send message. Please try again.';
                    state.isSending = false;
                  }),
                );
              },
            }),
          );
        }),
      ),
    ),
  })),

  // Layer 5: Methods that depend on previous layers
  withMethods((store) => ({
    /**
     * Send a message and clear input
     * Convenience method for common use case
     */
    sendAndClear(message: string, clearCallback?: () => void) {
      if (message.trim()) {
        store.sendMessage(message.trim());
        clearCallback?.();
      }
    },

    /**
     * Retry the last failed message
     */
    retryLastMessage() {
      const lastMessage = store.lastMessage();
      if (lastMessage && lastMessage.type === 'user') {
        store.sendMessage(lastMessage.content);
      }
    },

    /**
     * Remove the current conversation from the backend
     * This will also clear local messages
     */
    removeConversation: rxMethod<void>(
      pipe(
        switchMap(() => {
          const conversationId = store.conversationId();

          if (!conversationId) {
            // No conversation to remove, just clear locally
            store.startNewConversation();
            return [];
          }

          // Call API to remove conversation
          return store.chatApi.removeConversation(conversationId).pipe(
            tapResponse({
              next: () => {
                // Clear messages on success
                store.startNewConversation();
              },
              error: (error: Error) => {
                // Set error state
                patchState(
                  store,
                  produce((state: ChatState) => {
                    state.error =
                      error.message ||
                      'Failed to remove conversation. Please try again.';
                  }),
                );
              },
            }),
          );
        }),
      ),
    ),
  })),
);
