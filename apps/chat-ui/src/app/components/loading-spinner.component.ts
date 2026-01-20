import { Component, input } from '@angular/core';

/**
 * Loading Spinner Component
 *
 * Displays a loading spinner using DaisyUI loading component.
 * Supports different sizes and optional loading text.
 *
 * @example
 * ```html
 * <app-loading-spinner
 *   [size]="'lg'"
 *   [text]="'Sending message...'" />
 * ```
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex items-center justify-center gap-3 py-4">
      <span
        [class]="'loading loading-spinner loading-' + size()"></span>
      @if (text()) {
        <span class="text-base-content/70">{{ text() }}</span>
      }
    </div>
  `,
})
export class LoadingSpinnerComponent {
  /**
   * Size of the spinner
   * - xs: Extra small
   * - sm: Small
   * - md: Medium (default)
   * - lg: Large
   */
  size = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  /**
   * Optional loading text to display next to spinner
   */
  text = input<string>('');
}
