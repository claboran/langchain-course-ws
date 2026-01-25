import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatComponent } from '@langchain-course-ws/chat-components';
import { ChatStore } from '../services';
import { ErrorAlertComponent } from './error-alert.component';
import { mapStoreMessagesToLibrary } from '../services/chat-message.mapper';

/**
 * Chat Container Component
 *
 * Smart container component that manages the chat state via ChatStore.
 * Uses the library's ChatComponent for message display.
 *
 * Responsibilities:
 * - State management via ChatStore
 * - User input handling
 * - Error display and recovery
 * - Loading states
 * - Message sending
 * - User name management
 *
 * Delegates to library:
 * - Message display (lib-chat)
 * - Chat bubble styling
 */
@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [ReactiveFormsModule, ChatComponent, ErrorAlertComponent],
  template: `
    <div class="flex flex-col h-full max-w-4xl mx-auto">
      <!-- Header with User Name -->
      <div class="bg-base-200 p-4 rounded-t-lg">
        <div class="flex items-center justify-between gap-4 mb-3">
          <h2 class="text-xl font-bold">Chat Assistant</h2>
          @if (chatStore.hasActiveConversation()) {
            <div class="badge badge-primary">
              {{ chatStore.messages().length }} messages
            </div>
          }
        </div>

        <!-- User Name Input -->
        <div class="form-control">
          <div class="join">
            <input
              type="text"
              [formControl]="userNameControl"
              placeholder="Enter your name..."
              class="input input-bordered input-sm join-item flex-1"
              maxlength="100"
              autocomplete="name" />
            <button
              type="button"
              class="btn btn-sm btn-primary join-item"
              (click)="setUserName()"
              [disabled]="userNameControl.invalid || !userNameControl.value?.trim()">
              Set Name
            </button>
          </div>
          <label class="label w-full">
            <span class="label-text-alt ml-auto">
              Current: <strong>{{ chatStore.userName() }}</strong>
            </span>
          </label>
        </div>
      </div>

      <!-- Error Alert -->
      <div class="px-4 pt-4">
        <app-error-alert
          [error]="chatStore.error()"
          (dismiss)="chatStore.clearError()" />
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-hidden bg-base-200" #messagesContainer>
        @if (!chatStore.hasMessages() && !chatStore.isSending()) {
          <!-- Empty State -->
          <div
            class="flex items-center justify-center h-full text-base-content/50">
            <div class="text-center py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16 mx-auto mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-lg font-medium">Start a conversation</p>
              <p class="text-sm mt-2">Type a message below to begin</p>
            </div>
          </div>
        } @else {
          <!-- Library Chat Component for Message Display -->
          <lib-chat
            [userName]="chatStore.userName()"
            [messages]="libraryMessages()"
            [userBgColor]="'bg-primary'"
            [userTextColor]="'text-primary-content'"
            [assistantBgColor]="'bg-secondary'"
            [assistantTextColor]="'text-secondary-content'"
            [fontSize]="'text-base'" />

          <!-- Loading Indicator (shown while assistant is responding) -->
          @if (chatStore.isSending()) {
            <div class="px-4 pb-4">
              <div class="flex items-start gap-3">
                <div class="avatar placeholder">
                  <div
                    class="bg-secondary text-secondary-content w-10 h-10 rounded-full">
                    <span class="text-xs">AI</span>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="bg-secondary text-secondary-content rounded-lg p-4">
                    <div class="flex items-center gap-2">
                      <span class="loading loading-dots loading-sm"></span>
                      <span class="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input Area -->
      <div class="bg-base-200 p-4 rounded-b-lg">
        <form (submit)="sendMessage($event)" class="flex gap-2">
          <input
            type="text"
            [formControl]="messageControl"
            placeholder="Type your message..."
            class="input input-bordered flex-1"
            maxlength="5000"
            autocomplete="off" />
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="messageControl.invalid || messageControl.disabled || !messageControl.value?.trim()">
            @if (chatStore.isSending()) {
              <span class="loading loading-spinner loading-sm"></span>
            } @else {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            }
            <span>Send</span>
          </button>
        </form>

        <!-- Character count -->
        @if (messageControl.value && messageControl.value.length > 0) {
          <div class="text-xs text-base-content/50 mt-2 text-right">
            {{ messageControl.value.length }} / 5000 characters
          </div>
        }

        <!-- Actions -->
        <div class="flex gap-2 mt-3">
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            (click)="startNewChat()"
            [disabled]="chatStore.isSending()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          @if (chatStore.error()) {
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              (click)="chatStore.retryLastMessage()"
              [disabled]="chatStore.isSending()">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class ChatContainerComponent {
  readonly chatStore = inject(ChatStore);
  private readonly formBuilder = inject(FormBuilder);

  // Form controls
  readonly userNameControl = this.formBuilder.control('User', [
    Validators.required,
    Validators.maxLength(100),
  ]);

  readonly messageControl = this.formBuilder.control('', [
    Validators.required,
    Validators.maxLength(5000),
  ]);

  /**
   * Computed signal that maps store messages to library format
   */
  libraryMessages = computed(() => {
    return mapStoreMessagesToLibrary(this.chatStore.messages());
  });

  constructor() {
    // Initialize chat on component creation
    this.chatStore.setUserName('User');
    this.chatStore.startNewConversation();

    // Auto-scroll to bottom when new messages arrive
    effect(() => {
      const messages = this.chatStore.messages();
      if (messages.length > 0) {
        // Use setTimeout to wait for DOM update
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });

    // Manage message control state based on sending status
    effect(() => {
      if (this.chatStore.isSending()) {
        this.messageControl.disable();
      } else {
        this.messageControl.enable();
      }
    });
  }

  /**
   * Set the user name from input field
   */
  setUserName() {
    const name = this.userNameControl.value?.trim();
    if (name && this.userNameControl.valid) {
      this.chatStore.setUserName(name);
    }
  }

  /**
   * Send a message to the chat
   */
  sendMessage(event: Event) {
    event.preventDefault();
    const message = this.messageControl.value?.trim();

    if (message && this.messageControl.valid) {
      this.chatStore.sendMessage(message);
      this.messageControl.setValue(''); // Clear input
    }
  }

  /**
   * Start a new chat conversation
   */
  startNewChat() {
    if (
      this.chatStore.hasMessages() &&
      confirm('Are you sure you want to start a new conversation?')
    ) {
      this.chatStore.startNewConversation();
      this.messageControl.setValue('');
    } else if (!this.chatStore.hasMessages()) {
      this.chatStore.startNewConversation();
    }
  }

  /**
   * Scroll messages container to bottom
   */
  private scrollToBottom() {
    const chatElement = document.querySelector('lib-chat');
    if (chatElement) {
      chatElement.scrollTop = chatElement.scrollHeight;
    }
  }
}
