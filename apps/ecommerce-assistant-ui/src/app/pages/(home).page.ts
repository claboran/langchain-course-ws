import { Component } from '@angular/core';
import { EcommerceChatContainerComponent } from '../components/ecommerce-chat-container.component';

/**
 * Home Page Component
 *
 * Main landing page for the e-commerce assistant application.
 * Provides a layout with header, footer, and the shopping assistant interface.
 */
@Component({
  selector: 'ecommerce-assistant-ui-home',
  imports: [EcommerceChatContainerComponent],
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            E-commerce Shopping Assistant
          </a>
        </div>
        <div class="flex-none gap-2">
          <div class="badge badge-primary badge-outline">Powered by LangChain</div>
          <div class="badge badge-secondary badge-outline">Semantic Search</div>
        </div>
      </header>

      <!-- Main Content - Chat Interface -->
      <main class="flex-1 overflow-hidden bg-base-100">
        <div class="container mx-auto px-4 py-6 h-full">
          <app-ecommerce-chat-container />
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
            2026 - Built with AnalogJS, NestJS, LangChain, PGVector & DaisyUI
          </p>
        </aside>
      </footer>
    </div>
  `,
})
export default class HomeComponent {}
