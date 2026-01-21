import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownRendererComponent } from './markdown-renderer.component';

describe('MarkdownRendererComponent', () => {
  let component: MarkdownRendererComponent;
  let fixture: ComponentFixture<MarkdownRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownRendererComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('content', '# Test');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Input signals', () => {
    it('should accept required content input', () => {
      const testContent = '# Hello World';
      fixture.componentRef.setInput('content', testContent);
      expect(component.content()).toBe(testContent);
    });

    it('should accept optional cssClass input', () => {
      fixture.componentRef.setInput('content', 'test');
      fixture.componentRef.setInput('cssClass', 'custom-class');
      expect(component.cssClass()).toBe('custom-class');
    });

    it('should use empty string as default cssClass', () => {
      fixture.componentRef.setInput('content', 'test');
      expect(component.cssClass()).toBe('');
    });
  });

  describe('Basic markdown rendering', () => {
    it('should render headings', () => {
      fixture.componentRef.setInput('content', '# H1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')).toBeTruthy();
      expect(compiled.querySelector('h1')?.textContent).toContain('H1');
    });

    it('should render paragraphs', () => {
      fixture.componentRef.setInput('content', 'This is a paragraph.');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const paragraph = compiled.querySelector('p');
      expect(paragraph).toBeTruthy();
      expect(paragraph?.textContent).toContain('This is a paragraph.');
    });

    it('should render bold text', () => {
      fixture.componentRef.setInput('content', '**bold text**');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const strong = compiled.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe('bold text');
    });

    it('should render links', () => {
      fixture.componentRef.setInput(
        'content',
        '[Link Text](https://example.com)'
      );
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const link = compiled.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('should render lists', () => {
      fixture.componentRef.setInput('content', '- Item 1\n- Item 2');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const ul = compiled.querySelector('ul');
      const lis = compiled.querySelectorAll('li');
      expect(ul).toBeTruthy();
      expect(lis.length).toBe(2);
    });
  });

  describe('Code block rendering', () => {
    it('should render inline code', () => {
      fixture.componentRef.setInput('content', 'Here is `inline code`');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const code = compiled.querySelector('code');
      expect(code).toBeTruthy();
      expect(code?.textContent).toContain('inline code');
    });

    it('should render code blocks', () => {
      const codeContent = '```\nconst x = 10;\n```';
      fixture.componentRef.setInput('content', codeContent);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const pre = compiled.querySelector('pre');
      const code = compiled.querySelector('code');
      expect(pre).toBeTruthy();
      expect(code).toBeTruthy();
      expect(code?.textContent).toContain('const x = 10;');
    });

    it('should apply syntax highlighting for JavaScript', () => {
      const jsCode = '```javascript\nconst hello = "world";\n```';
      fixture.componentRef.setInput('content', jsCode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const code = compiled.querySelector('code');
      expect(code).toBeTruthy();
      // Check for Prism token classes
      const html = compiled.innerHTML;
      expect(html).toContain('token');
    });
  });

  describe('Mermaid diagram support', () => {
    it('should render mermaid code blocks with mermaid class', () => {
      const mermaidCode = '```mermaid\ngraph TD\n  A-->B\n```';
      fixture.componentRef.setInput('content', mermaidCode);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const mermaidPre = compiled.querySelector('pre.mermaid');
      expect(mermaidPre).toBeTruthy();
      expect(mermaidPre?.textContent).toContain('graph TD');
    });
  });

  describe('HTML sanitization', () => {
    it('should sanitize dangerous HTML', () => {
      const dangerousContent = '<script>alert("xss")</script>';
      fixture.componentRef.setInput('content', dangerousContent);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const script = compiled.querySelector('script');
      expect(script).toBeNull();
    });

    it('should allow safe HTML elements', () => {
      const safeContent = '**Bold** and *italic* text';
      fixture.componentRef.setInput('content', safeContent);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('strong')).toBeTruthy();
      expect(compiled.querySelector('em')).toBeTruthy();
    });
  });

  describe('CSS class application', () => {
    it('should apply custom CSS class to container', () => {
      fixture.componentRef.setInput('content', '# Test');
      fixture.componentRef.setInput('cssClass', 'my-custom-class');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const div = compiled.querySelector('div');
      expect(div?.classList.contains('my-custom-class')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content', () => {
      fixture.componentRef.setInput('content', '');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent?.trim()).toBe('');
    });

    it('should handle content updates', () => {
      fixture.componentRef.setInput('content', '# First');
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('First');

      fixture.componentRef.setInput('content', '# Second');
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('Second');
    });
  });

  describe('GFM features', () => {
    it('should render strikethrough text', () => {
      fixture.componentRef.setInput('content', '~~strikethrough~~');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const del = compiled.querySelector('del');
      expect(del).toBeTruthy();
      expect(del?.textContent).toBe('strikethrough');
    });

    it('should render tables', () => {
      const table = `| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |`;
      fixture.componentRef.setInput('content', table);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('table')).toBeTruthy();
    });
  });
});
