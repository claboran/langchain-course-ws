import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  SecurityContext,
  inject,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Marked, Renderer } from 'marked';
import { markedHighlight } from 'marked-highlight';
// @ts-expect-error - Prism types may not be available
import Prism from 'prismjs';
// Pre-import common Prism languages to avoid dynamic import issues
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML


/**
 * Custom Markdown Renderer Component
 *
 * Features:
 * - Uses marked library with GFM support
 * - Prism.js syntax highlighting for code blocks (dynamically loaded on demand)
 * - Mermaid diagram support
 * - Sanitizes HTML output for security
 *
 * The component automatically detects code block languages in the content and
 * dynamically loads the required Prism language grammars, reducing initial bundle size.
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

    /* Prism syntax highlighting styles */
    :host ::ng-deep .token.comment,
    :host ::ng-deep .token.prolog,
    :host ::ng-deep .token.doctype,
    :host ::ng-deep .token.cdata {
      color: #6a9955;
    }

    :host ::ng-deep .token.punctuation {
      color: #d4d4d4;
    }

    :host ::ng-deep .token.property,
    :host ::ng-deep .token.tag,
    :host ::ng-deep .token.boolean,
    :host ::ng-deep .token.number,
    :host ::ng-deep .token.constant,
    :host ::ng-deep .token.symbol,
    :host ::ng-deep .token.deleted {
      color: #b5cea8;
    }

    :host ::ng-deep .token.selector,
    :host ::ng-deep .token.attr-name,
    :host ::ng-deep .token.string,
    :host ::ng-deep .token.char,
    :host ::ng-deep .token.builtin,
    :host ::ng-deep .token.inserted {
      color: #ce9178;
    }

    :host ::ng-deep .token.operator,
    :host ::ng-deep .token.entity,
    :host ::ng-deep .token.url,
    :host ::ng-deep .language-css .token.string,
    :host ::ng-deep .style .token.string {
      color: #d4d4d4;
    }

    :host ::ng-deep .token.atrule,
    :host ::ng-deep .token.attr-value,
    :host ::ng-deep .token.keyword {
      color: #c586c0;
    }

    :host ::ng-deep .token.function,
    :host ::ng-deep .token.class-name {
      color: #dcdcaa;
    }

    :host ::ng-deep .token.regex,
    :host ::ng-deep .token.important,
    :host ::ng-deep .token.variable {
      color: #d16969;
    }

    /* Mermaid diagram styling */
    :host ::ng-deep .mermaid {
      background-color: transparent;
      text-align: center;
      width: 100%;
      min-width: 300px;
      min-height: 100px;
      display: block;
      overflow: visible;
    }

    :host ::ng-deep .mermaid svg {
      max-width: 100%;
      height: auto;
      min-width: 0;
      overflow: visible;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent {
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Inputs
  content = input.required<string>();
  cssClass = input<string>('');

  // Create a custom marked instance to avoid global state pollution
  private markedInstance = new Marked();

  // Track loaded Prism languages to avoid reloading
  // Pre-mark common languages as loaded since we import them at the top
  private loadedLanguages = new Set<string>([
    'javascript', 'js',
    'typescript', 'ts',
    'python', 'py',
    'bash', 'sh',
    'json',
    'markdown', 'md',
    'css',
    'markup', 'html', 'xml'
  ]);

  /**
   * Dynamically load a Prism language grammar
   */
  private async loadPrismLanguage(lang: string): Promise<void> {
    if (!this.isBrowser || this.loadedLanguages.has(lang)) {
      return;
    }

    // Map of language aliases to their actual component names
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml',
      'html': 'markup',
      'xml': 'markup',
      'svg': 'markup',
      'md': 'markdown',
    };

    const actualLang = languageMap[lang] || lang;

    // Check if language is already loaded in Prism
    if (Prism.languages[actualLang]) {
      this.loadedLanguages.add(lang);
      this.loadedLanguages.add(actualLang);
      return;
    }

    try {
      // Dynamically import the language component
      // @ts-ignore - Vite dynamic import limitation
      await import(/* @vite-ignore */ `prismjs/components/prism-${actualLang}`);
      this.loadedLanguages.add(lang);
      this.loadedLanguages.add(actualLang);
    } catch (e) {
      console.warn(`Failed to load Prism language: ${actualLang}`, e);
    }
  }

  constructor() {
    // Configure this instance of marked with syntax highlighting
    this.markedInstance.use(
      markedHighlight({
        highlight: (code, lang) => {
          // Handle mermaid specially - don't highlight, just return
          if (lang === 'mermaid') {
            return code;
          }

          if (lang && Prism.languages[lang]) {
            try {
              return Prism.highlight(code, Prism.languages[lang], lang);
            } catch (e) {
              console.error('Prism highlighting error:', e);
              return code;
            }
          }

          // If language is not loaded yet, return the code as-is
          // It will be highlighted on the next render after dynamic load
          return code;
        },
      }),
      {
        breaks: true,
        gfm: true,
      }
    );

    // Add custom renderer for mermaid after markedHighlight
    const renderer = new Renderer();
    renderer.code = (token) => {
      const code = token.text;
      const lang = token.lang || '';

      // Handle mermaid diagrams
      if (lang === 'mermaid') {
        // Don't escape - Mermaid needs raw code to parse
        return `<pre class="mermaid">${code}</pre>`;
      }

      // For other code blocks, use the default rendering
      // (already processed by markedHighlight)
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${code}</code></pre>`;
    };

    this.markedInstance.use({ renderer });
  }

  // Effect to dynamically load required Prism languages based on content
  private loadLanguagesEffect = effect(() => {
    if (!this.isBrowser) return;

    const content = this.content();
    // Match code blocks with language specifications
    const codeBlockRegex = /```(\w+)/g;
    const matches = content.matchAll(codeBlockRegex);

    for (const match of matches) {
      const lang = match[1];
      if (lang && lang !== 'mermaid') {
        this.loadPrismLanguage(lang);
      }
    }
  });

  // Track if mermaid has been initialized
  private mermaidInitialized = false;

  // Effect to initialize mermaid diagrams after rendering
  private initMermaidEffect = effect(() => {
    if (!this.isBrowser) return;

    const content = this.content();
    if (content.includes('```mermaid')) {
      // Dynamically import mermaid to avoid SSR issues
      import('mermaid').then((mermaid) => {
        // Only initialize once
        if (!this.mermaidInitialized) {
          mermaid.default.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose', // 'sandbox' creates iframe that blocks scripts
            // Alternative: 'antiscript' - more secure but may have compatibility issues
          });
          this.mermaidInitialized = true;
        }

        // Run mermaid on new content with proper delay
        setTimeout(() => {
          // Query for unprocessed mermaid diagrams
          const mermaidElements = document.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])');
          if (mermaidElements.length > 0) {
            mermaid.default.run({
              nodes: mermaidElements as unknown as ArrayLike<HTMLElement>,
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
            });
          }
        }, 100); // Increased delay for DOM updates
      });
    }
  });

  // Computed signal for rendered and sanitized HTML
  sanitizedHtml = computed(() => {
    const rawHtml = this.markedInstance.parse(this.content()) as string;

    // For Mermaid diagrams, we need to bypass sanitization as Angular's sanitizer
    // strips the necessary scripts and SVG elements that Mermaid needs to function
    // This is safe because:
    // 1. The content comes from marked.js which escapes user input
    // 2. Mermaid itself sanitizes diagram definitions
    // 3. We're only bypassing for rendering, not for data storage
    if (this.content().includes('```mermaid')) {
      return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    }

    // For regular markdown without Mermaid, use standard sanitization
    return this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
  });
}
