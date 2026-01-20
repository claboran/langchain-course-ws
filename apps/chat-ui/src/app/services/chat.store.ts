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
import type { ChatRequest } from '../../shared';

/**
 * Chat Message Type
 */
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

/**
 * Chat Store State
 */
export type ChatState = {
  messages: ChatMessage[];
  conversationId: string | null;
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
        produce((state) => {
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
        produce((state) => {
          state.error = null;
        }),
      );
    },

    /**
     * Start a new conversation
     */
    startNewConversation() {
      patchState(
        store,
        produce((state) => {
          state.messages = [];
          state.conversationId = uuidv4();
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
     */
    addUserMessage(content: string): string {
      const messageId = uuidv4();
      patchState(
        store,
        produce((state) => {
          state.messages.push({
            id: messageId,
            role: 'user',
            content,
            timestamp: new Date(),
          });
        }),
      );
      return messageId;
    },

    /**
     * Add an assistant message to the conversation
     */
    addAssistantMessage(content: string) {
      patchState(
        store,
        produce((state) => {
          state.messages.push({
            id: uuidv4(),
            role: 'assistant',
            content,
            timestamp: new Date(),
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
        produce((state) => {
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
     * 1. Adds user message optimistically
     * 2. Sends request to API
     * 3. Adds assistant response on success
     * 4. Rolls back on error
     *
     * @param message - The message content to send
     */
    sendMessage: rxMethod<string>(
      pipe(
        tap((message) => {
          // Ensure we have a conversation ID
          if (!store.conversationId()) {
            patchState(
              store,
              produce((state) => {
                state.conversationId = uuidv4();
              }),
            );
          }

          // Clear any previous errors
          patchState(
            store,
            produce((state) => {
              state.error = null;
              state.isSending = true;
            }),
          );
        }),
        switchMap((message) => {
          // Optimistically add user message
          const userMessageId = store.addUserMessage(message);

          // Prepare request
          const request: ChatRequest = {
            message,
            user: store.userName(),
            conversationId: store.conversationId()!,
          };

          // Send to API
          return store.chatApi.sendMessage(request).pipe(
            tapResponse({
              next: (response) => {
                // Add assistant response
                patchState(
                  store,
                  produce((state) => {
                    state.messages.push({
                      id: uuidv4(),
                      role: 'assistant',
                      content: response.message,
                      timestamp: new Date(),
                    });
                    state.isSending = false;
                    // Update conversation ID from response (in case it changed)
                    state.conversationId = response.conversationId;
                  }),
                );
              },
              error: (error: Error) => {
                // Rollback: remove optimistic user message
                store.removeMessage(userMessageId);

                // Set error state
                patchState(
                  store,
                  produce((state) => {
                    state.error =
                      error.message || 'Failed to send message. Please try again.';
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
      if (lastMessage && lastMessage.role === 'user') {
        store.sendMessage(lastMessage.content);
      }
    },
  })),
);
