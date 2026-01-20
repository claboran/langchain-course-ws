import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MarkdownRendererComponent } from '../markdown-renderer/markdown-renderer.component';
import { ChatMessage } from '../types/chat-message';

@Component({
  selector: 'lib-chat-bubble',
  imports: [MarkdownRendererComponent],
  template: `
    @if (message().type === 'user') {
      <!-- User message (left side) -->
      <div class="chat chat-start">
        <div class="chat-image avatar">
          <div class="w-10 rounded-full bg-neutral text-neutral-content">
            <div class="flex h-full items-center justify-center font-semibold">
              {{ userInitials() }}
            </div>
          </div>
        </div>
        <div class="chat-header">
          {{ userName() }}
          <time class="ml-2 text-xs opacity-50">{{
            formatTime(message().timestamp)
          }}</time>
        </div>
        <div [class]="bubbleClasses()">
          @if (message().isMarkdown) {
            <lib-markdown-renderer
              [content]="message().content"
              cssClass="prose prose-sm max-w-none prose-invert"
            />
          } @else {
            {{ message().content }}
          }
        </div>
      </div>
    } @else {
      <!-- Assistant message (right side) -->
      <div class="chat chat-end">
        <div class="chat-image avatar">
          <div class="w-10 rounded-full bg-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-full w-full p-2 text-accent-content"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
              />
            </svg>
          </div>
        </div>
        <div class="chat-header">
          Assistant
          <time class="ml-2 text-xs opacity-50">{{
            formatTime(message().timestamp)
          }}</time>
        </div>
        <div [class]="bubbleClasses()">
          @if (message().isMarkdown) {
            <lib-markdown-renderer
              [content]="message().content"
              cssClass="prose prose-sm max-w-none prose-invert"
            />
          } @else {
            {{ message().content }}
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    /* Markdown styling overrides for chat bubbles */
    :host ::ng-deep .prose {
      color: inherit;
    }

    :host ::ng-deep .prose h1,
    :host ::ng-deep .prose h2,
    :host ::ng-deep .prose h3 {
      color: inherit;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    :host ::ng-deep .prose ul,
    :host ::ng-deep .prose ol {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      list-style-position: outside;
    }

    /* Unordered list bullets (disc | circle | square) */
    :host ::ng-deep .prose ul {
      list-style-type: disc;
    }

    /* Ordered list numbering (decimal | lower-alpha | lower-roman | etc.) */
    :host ::ng-deep .prose ol {
      list-style-type: decimal;
    }

    /* Style markers to inherit color/size from chat bubble */
    :host ::ng-deep .prose li::marker {
      color: inherit;
      font-size: 0.9em;
    }

    :host ::ng-deep .prose p {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    :host ::ng-deep .prose code {
      background-color: rgba(0, 0, 0, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }

    :host ::ng-deep .prose pre {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 1em;
      border-radius: 0.5em;
      overflow-x: auto;
    }

    :host ::ng-deep .prose pre code {
      background-color: transparent;
      padding: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatBubbleComponent {
  // Required inputs
  message = input.required<ChatMessage>();
  userName = input.required<string>();
  userInitials = input.required<string>();

  // Style customization inputs
  bgColor = input<string>('');
  textColor = input<string>('');
  fontSize = input<string>('text-sm');

  // Computed class string
  bubbleClasses = computed(
    () =>
      `chat-bubble ${this.bgColor()} ${this.textColor()} ${this.fontSize()}`,
  );

  /**
   * Format timestamp for display
   */
  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
