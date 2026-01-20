import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  SecurityContext,
  inject,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Custom Markdown Renderer Component
 *
 * Uses marked library with breaks: true to properly handle line breaks.
 * Sanitizes HTML output for security.
 */
@Component({
  selector: 'lib-markdown-renderer',
  standalone: true,
  template: `
    <div [innerHTML]="sanitizedHtml()" [class]="cssClass()"></div>
  `,
  styles: `
    :host {
      display: block;
    }

    /* Markdown styling */
    :host ::ng-deep h1,
    :host ::ng-deep h2,
    :host ::ng-deep h3,
    :host ::ng-deep h4,
    :host ::ng-deep h5,
    :host ::ng-deep h6 {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      font-weight: bold;
    }

    :host ::ng-deep h1 { font-size: 1.5em; }
    :host ::ng-deep h2 { font-size: 1.3em; }
    :host ::ng-deep h3 { font-size: 1.1em; }

    :host ::ng-deep p {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    :host ::ng-deep ul,
    :host ::ng-deep ol {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      padding-left: 1.5em;
    }

    :host ::ng-deep li {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }

    :host ::ng-deep code {
      background-color: rgba(0, 0, 0, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
      font-family: 'Courier New', monospace;
    }

    :host ::ng-deep pre {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 1em;
      border-radius: 0.5em;
      overflow-x: auto;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    :host ::ng-deep pre code {
      background-color: transparent;
      padding: 0;
    }

    :host ::ng-deep blockquote {
      border-left: 3px solid rgba(255, 255, 255, 0.3);
      padding-left: 1em;
      margin-left: 0;
      opacity: 0.8;
    }

    :host ::ng-deep hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      margin: 1em 0;
    }

    :host ::ng-deep strong {
      font-weight: bold;
    }

    :host ::ng-deep em {
      font-style: italic;
    }

    :host ::ng-deep a {
      color: inherit;
      text-decoration: underline;
      opacity: 0.9;
    }

    :host ::ng-deep a:hover {
      opacity: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent {
  private sanitizer = inject(DomSanitizer);

  // Inputs
  content = input.required<string>();
  cssClass = input<string>('');

  // Configure marked with breaks enabled
  constructor() {
    marked.setOptions({
      breaks: true, // Convert \n to <br>
      gfm: true, // GitHub Flavored Markdown
    });
  }

  // Computed signal for rendered and sanitized HTML
  sanitizedHtml = computed(() => {
    const rawHtml = marked.parse(this.content()) as string;
    return this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
  });
}
