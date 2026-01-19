import { Component } from '@angular/core';
import { ChatComponent, ChatMessage } from '@langchain-course-ws/chat-components';

@Component({
  selector: 'chat-ui-home',
  imports: [ChatComponent],
  template: `
    <div class="flex flex-col h-screen" data-theme="dark">
      <!-- Header -->
      <header class="navbar bg-base-300 shadow-lg">
        <div class="flex-1">
          <a class="btn btn-ghost text-xl">Chat UI</a>
        </div>
        <div class="flex-none">
          <button class="btn btn-square btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="inline-block h-5 w-5 stroke-current">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden bg-base-100">
        <div class="container mx-auto px-4 py-6 flex flex-col h-full max-w-4xl">
          <!-- Name Form -->
          <div class="card bg-base-200 shadow-xl mb-4">
            <div class="card-body">
              <h2 class="card-title text-lg">Your Name</h2>
              <div class="form-control">
                <div class="join">
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    class="input input-bordered input-primary join-item flex-1"
                  />
                  <button class="btn btn-primary join-item">Set Name</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Component -->
          <div class="flex-1 card bg-base-200 shadow-xl overflow-hidden mb-4">
            <div class="card-body p-0 h-full">
              <lib-chat
                [userName]="sampleUserName"
                [messages]="sampleMessages"
              />
            </div>
          </div>

          <!-- Message Form -->
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-lg">Send Message</h2>
              <div class="form-control">
                <textarea
                  placeholder="Type your message..."
                  class="textarea textarea-bordered textarea-primary w-full"
                  rows="3"
                ></textarea>
                <div class="flex justify-end mt-2">
                  <button class="btn btn-primary">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="footer footer-center bg-base-300 text-base-content p-4">
        <aside>
          <p class="flex items-center gap-1">
            From Mannheim with
            <svg
              class="w-5 h-5 fill-red-500"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            2026 - Built with AnalogJS and DaisyUI
          </p>
        </aside>
      </footer>
    </div>
  `,
})
export default class HomeComponent {
  // Sample data for demo purposes (no state management yet)
  sampleUserName = 'Guest User';
  sampleMessages: ChatMessage[] = [
    {
      type: 'user',
      content: 'Hello! How are you?',
      timestamp: new Date(),
    },
    {
      type: 'assistant',
      content: 'I am doing great, thank you for asking!',
      timestamp: new Date(),
    },
  ];
}
