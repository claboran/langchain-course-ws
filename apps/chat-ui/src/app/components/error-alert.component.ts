import { Component, input, output } from '@angular/core';

/**
 * Error Alert Component
 *
 * Displays error messages using DaisyUI alert component.
 * Supports dismissible alerts with customizable error messages.
 *
 * @example
 * ```html
 * <app-error-alert
 *   [error]="errorMessage()"
 *   (dismiss)="handleDismiss()" />
 * ```
 */
@Component({
  selector: 'app-error-alert',
  standalone: true,
  template: `
    @if (error()) {
      <div role="alert" class="alert alert-error mb-4">
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
        <div class="flex-1">
          <span>{{ error() }}</span>
        </div>
        @if (dismissible()) {
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            (click)="handleDismiss()">
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
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }
      </div>
    }
  `,
})
export class ErrorAlertComponent {
  /**
   * Error message to display
   */
  error = input<string | null>(null);

  /**
   * Whether the alert can be dismissed
   */
  dismissible = input<boolean>(true);

  /**
   * Event emitted when the alert is dismissed
   */
  dismiss = output<void>();

  /**
   * Handle dismiss button click
   */
  handleDismiss() {
    this.dismiss.emit();
  }
}
