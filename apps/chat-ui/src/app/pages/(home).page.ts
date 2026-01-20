import { Component } from '@angular/core';
import { ChatContainerComponent } from '../components';

/**
 * Home Page Component
 *
 * Main landing page for the chat application.
 * Provides a layout with header, footer, and the chat interface.
 */
@Component({
  selector: 'chat-ui-home',
  imports: [ChatContainerComponent],
  template: `
    <div class="flex flex-col h-screen" data-theme="dark">
      <!-- Header -->
      <header class="navbar bg-base-300 shadow-lg">
        <div class="flex-1">
          <a class="btn btn-ghost text-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            LangChain Chat
          </a>
        </div>
        <div class="flex-none gap-2">
          <div class="badge badge-primary badge-outline">Powered by LangChain</div>
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

      <!-- Main Content - Chat Interface -->
      <main class="flex-1 overflow-hidden bg-base-100">
        <div class="container mx-auto px-4 py-6 h-full">
          <app-chat-container />
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
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            2026 - Built with AnalogJS, NestJS, LangChain & DaisyUI
          </p>
        </aside>
      </footer>
    </div>
  `,
})
export default class HomeComponent {}
