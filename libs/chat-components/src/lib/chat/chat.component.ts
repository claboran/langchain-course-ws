import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ChatMessage } from '../types/chat-message';
import { ChatBubbleComponent } from '../chat-bubble/chat-bubble.component';

@Component({
  selector: 'lib-chat',
  imports: [ChatBubbleComponent],
  template: `
    <div class="flex flex-col gap-4 p-4">
      @for (message of messages(); track $index) {
        <lib-chat-bubble
          [message]="message"
          [userName]="userName()"
          [userInitials]="getUserInitials()"
          [bgColor]="getBgColor(message.type)"
          [textColor]="getTextColor(message.type)"
          [fontSize]="fontSize()"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  // Input signals
  userName = input.required<string>();
  messages = input<ChatMessage[]>([]);

  // Style customization inputs
  userBgColor = input<string>('bg-primary');
  userTextColor = input<string>('text-primary-content');
  assistantBgColor = input<string>('bg-secondary');
  assistantTextColor = input<string>('text-secondary-content');
  fontSize = input<string>('text-sm');

  /**
   * Get initials from user name for avatar
   */
  getUserInitials(): string {
    const name = this.userName();
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Get background color based on message type
   */
  getBgColor(type: 'user' | 'assistant'): string {
    return type === 'user' ? this.userBgColor() : this.assistantBgColor();
  }

  /**
   * Get text color based on message type
   */
  getTextColor(type: 'user' | 'assistant'): string {
    return type === 'user' ? this.userTextColor() : this.assistantTextColor();
  }
}
