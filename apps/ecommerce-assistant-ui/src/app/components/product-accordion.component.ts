import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProductDocument } from '../services/ecommerce-assistant.store';

/**
 * Product Accordion Component
 *
 * Displays product information in a DaisyUI accordion.
 * Shows category, ID, and truncated content when collapsed.
 * Shows full content with scrollbar when expanded.
 */
@Component({
  selector: 'app-product-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @for (product of products(); track product.metadata.id) {
        <div class="collapse collapse-arrow bg-base-200">
          <input type="radio" [name]="'product-accordion-' + accordionId()" />
          <div class="collapse-title text-sm font-medium">
            <div class="flex items-center gap-2">
              <span class="badge badge-primary badge-sm">{{
                product.metadata.category
              }}</span>
              <span class="text-xs text-base-content/60">{{
                product.metadata.id
              }}</span>
            </div>
            <div class="mt-1 text-xs text-base-content/80 line-clamp-1">
              {{ truncateText(product.content, 60) }}
            </div>
          </div>
          <div class="collapse-content">
            <div
              class="max-h-32 overflow-y-auto text-sm text-base-content/90 p-2 bg-base-300 rounded"
            >
              {{ product.content }}
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `,
})
export class ProductAccordionComponent {
  /**
   * Array of product documents to display
   */
  products = input.required<ProductDocument[]>();

  /**
   * Unique ID for this accordion instance (for radio button grouping)
   */
  accordionId = input<string>('default');

  /**
   * Truncate text to a maximum length with ellipsis
   */
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
}
