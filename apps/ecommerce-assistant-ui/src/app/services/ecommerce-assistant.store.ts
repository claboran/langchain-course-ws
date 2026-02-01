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
import { produce } from 'immer';
import { pipe, switchMap, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { EcommerceAssistantService } from './ecommerce-assistant.service';
import type { ConversationResponseDto } from '../../server/openapi-client';

/**
 * Product document structure from the API
 */
export interface ProductDocument {
  content: string;
  metadata: {
    id: string;
    category: string;
    [key: string]: unknown;
  };
}

/**
 * Message in the conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasMarkdown: boolean;
  products?: ProductDocument[];
  timestamp: Date;
}

/**
 * Store state for e-commerce assistant
 */
export type EcommerceAssistantState = {
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: EcommerceAssistantState = {
  messages: [],
  conversationId: null,
  isLoading: false,
  error: null,
};

/**
 * NgRx Signal Store for E-commerce Assistant
 *
 * Manages conversation state, messages, and API interactions
 * with the e-commerce assistant backend.
 */
export const EcommerceAssistantStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  // Layer 1: Inject dependencies using withProps
  withProps(() => ({
    apiService: inject(EcommerceAssistantService),
  })),

  // Layer 2: Computed values
  withComputed((store) => ({
    /**
     * Whether there are any messages in the conversation
     */
    hasMessages: computed(() => store.messages().length > 0),

    /**
     * Latest assistant message (for debugging/display)
     */
    latestMessage: computed(() => {
      const messages = store.messages();
      return messages.length > 0 ? messages[messages.length - 1] : null;
    }),
  })),

  // Layer 3: Basic synchronous methods
  withMethods((store) => ({
    /**
     * Clear the error message
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
     * Reset the entire conversation
     */
    reset() {
      patchState(store, initialState);
    },

    /**
     * Add a user message to the conversation
     */
    addUserMessage(content: string) {
      patchState(
        store,
        produce((state) => {
          state.messages.push({
            id: uuidv4(),
            role: 'user',
            content,
            hasMarkdown: false,
            timestamp: new Date(),
          });
        }),
      );
    },

    /**
     * Add an assistant message with optional products
     */
    addAssistantMessage(
      content: string,
      hasMarkdown: boolean,
      products?: ProductDocument[],
    ) {
      patchState(
        store,
        produce((state) => {
          state.messages.push({
            id: uuidv4(),
            role: 'assistant',
            content,
            hasMarkdown,
            products,
            timestamp: new Date(),
          });
        }),
      );
    },
  })),

  // Layer 4: Async operations with rxMethod
  withMethods((store) => ({
    /**
     * Send a message to the assistant
     * Creates a new conversation if one doesn't exist,
     * otherwise continues the existing conversation.
     */
    sendMessage: rxMethod<string>(
      pipe(
        tap((message) => {
          // Add user message to UI
          store.addUserMessage(message);

          // Set loading state
          patchState(
            store,
            produce((state) => {
              state.isLoading = true;
              state.error = null;
            }),
          );
        }),
        switchMap((message) => {
          const conversationId = store.conversationId();

          // Choose API method based on whether conversation exists
          const apiCall = conversationId
            ? store.apiService.continueConversation(conversationId, { message })
            : store.apiService.createConversation({ message });

          return apiCall.pipe(
            tapResponse({
              next: (response: ConversationResponseDto) => {
                // Add assistant response to messages
                store.addAssistantMessage(
                  response.summary,
                  response.hasMarkdown,
                  response.products as ProductDocument[],
                );

                // Update conversation ID if it's a new conversation
                patchState(
                  store,
                  produce((state) => {
                    if (!state.conversationId) {
                      state.conversationId = response.conversationId;
                    }
                    state.isLoading = false;
                  }),
                );
              },
              error: (error: Error) => {
                patchState(
                  store,
                  produce((state) => {
                    state.error =
                      error.message || 'Failed to send message. Please try again.';
                    state.isLoading = false;
                  }),
                );
              },
            }),
          );
        }),
      ),
    ),

    /**
     * Delete the current conversation
     */
    deleteConversation: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(
            store,
            produce((state) => {
              state.isLoading = true;
              state.error = null;
            }),
          );
        }),
        switchMap(() => {
          const conversationId = store.conversationId();
          if (!conversationId) {
            return [];
          }

          return store.apiService.deleteConversation(conversationId).pipe(
            tapResponse({
              next: () => {
                // Reset to initial state after successful deletion
                patchState(store, initialState);
              },
              error: (error: Error) => {
                patchState(
                  store,
                  produce((state) => {
                    state.error =
                      error.message || 'Failed to delete conversation.';
                    state.isLoading = false;
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
     * Start a new conversation (deletes current and resets)
     */
    startNewConversation() {
      const conversationId = store.conversationId();
      if (conversationId) {
        store.deleteConversation();
      } else {
        store.reset();
      }
    },
  })),
);
