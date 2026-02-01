import { Component, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatBubbleComponent } from '@langchain-course-ws/chat-components';
import { EcommerceAssistantStore } from '../services/ecommerce-assistant.store';
import { ProductAccordionComponent } from './product-accordion.component';

/**
 * E-commerce Chat Container Component
 *
 * Main container for the e-commerce assistant chat interface.
 * Manages the chat UI, input handling, and product display.
 */
@Component({
  selector: 'app-ecommerce-chat-container',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ChatBubbleComponent,
    ProductAccordionComponent,
  ],
  template: `
    <div class="flex flex-col h-full max-w-4xl mx-auto">
      <!-- Chat Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        @if (!store.hasMessages()) {
          <div class="flex flex-col items-center justify-center h-full text-center">
            <div class="text-6xl mb-4">🛍️</div>
            <h2 class="text-2xl font-bold mb-2">E-commerce Shopping Assistant</h2>
            <p class="text-base-content/70 max-w-md">
              Ask me about products, browse categories, or get recommendations!
              I can help you find books, household items, and clothing & accessories.
            </p>
          </div>
        } @else {
          @for (message of store.messages(); track message.id) {
            <lib-chat-bubble
              [message]="{
                type: message.role === 'user' ? 'user' : 'assistant',
                content: message.content,
                timestamp: message.timestamp,
                isMarkdown: message.hasMarkdown
              }"
              [userName]="'User'"
              [userInitials]="'U'"
            />

            <!-- Product Accordion below assistant messages -->
            @if (message.role === 'assistant' && message.products && message.products.length > 0) {
              <div class="ml-12 mt-2">
                <div class="text-sm font-semibold mb-2 text-base-content/80">
                  📦 Found {{ message.products.length }}
                  {{ message.products.length === 1 ? 'product' : 'products' }}:
                </div>
                <app-product-accordion
                  [products]="message.products"
                  [accordionId]="message.id"
                />
              </div>
            }
          }
        }

        <!-- Error Message -->
        @if (store.error()) {
          <div class="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ store.error() }}</span>
            <button class="btn btn-sm btn-ghost" (click)="store.clearError()">
              Dismiss
            </button>
          </div>
        }

        <!-- Loading Indicator -->
        @if (store.isLoading()) {
          <div class="flex items-center gap-2 text-base-content/60">
            <span class="loading loading-dots loading-sm"></span>
            <span class="text-sm">Searching for products...</span>
          </div>
        }
      </div>

      <!-- Input Area -->
      <div class="border-t border-base-300 p-4 bg-base-200">
        <form (submit)="sendMessage($event)" class="flex gap-2 items-end">
          <!-- Clear/New Conversation Button -->
          @if (store.hasMessages()) {
            <button
              type="button"
              class="btn btn-square btn-ghost"
              (click)="startNewConversation()"
              [disabled]="store.isLoading()"
              title="Start new conversation">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4" />
              </svg>
            </button>
          }

          <!-- Text Input -->
          <textarea
            [formControl]="messageControl"
            (keydown)="onKeydown($event)"
            class="textarea textarea-bordered flex-1 min-h-[3rem] max-h-[8rem] resize-none"
            placeholder="Ask about products (e.g., 'I need a mystery book' or 'What categories do you have?')"
            rows="1"
            maxlength="5000"
            autocomplete="off"
          ></textarea>

          <!-- Send Button -->
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="messageControl.invalid || messageControl.disabled || !messageControl.value?.trim()">
            @if (store.isLoading()) {
              <span class="loading loading-spinner loading-sm"></span>
            } @else {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            }
            Send
          </button>
        </form>

        <!-- Conversation Info -->
        @if (store.conversationId()) {
          <div class="text-xs text-base-content/50 mt-2">
            Conversation ID: {{ store.conversationId() }}
          </div>
        }
      </div>
    </div>
  `,
})
export class EcommerceChatContainerComponent {
  readonly store = inject(EcommerceAssistantStore);
  private readonly formBuilder = inject(FormBuilder);

  // Form control for message input
  readonly messageControl = this.formBuilder.control('', [
    Validators.required,
    Validators.maxLength(5000),
  ]);

  constructor() {
    // Manage message control state based on loading status
    effect(() => {
      if (this.store.isLoading()) {
        this.messageControl.disable();
      } else {
        this.messageControl.enable();
      }
    });

    // Auto-scroll to bottom when new messages arrive
    effect(() => {
      const messages = this.store.messages();
      if (messages.length > 0) {
        // Use setTimeout to wait for DOM update
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  /**
   * Send the current message
   */
  sendMessage(event: Event) {
    event.preventDefault();
    this.submitMessage();
  }

  /**
   * Submit message logic (extracted for reuse)
   */
  private submitMessage() {
    const message = this.messageControl.value?.trim();

    if (message && this.messageControl.valid) {
      this.store.sendMessage(message);
      this.messageControl.setValue(''); // Clear input
    }
  }

  /**
   * Start a new conversation
   */
  startNewConversation() {
    if (
      this.store.hasMessages() &&
      confirm('Are you sure you want to start a new conversation?')
    ) {
      this.store.startNewConversation();
      this.messageControl.setValue('');
    }
  }

  /**
   * Handle Enter key (send on Enter, new line on Shift+Enter)
   */
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    }
  }

  /**
   * Scroll messages container to bottom
   */
  private scrollToBottom() {
    const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}
