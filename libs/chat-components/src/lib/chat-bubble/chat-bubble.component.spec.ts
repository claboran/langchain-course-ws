import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatBubbleComponent } from './chat-bubble.component';
import { ChatMessage } from '../types/chat-message';

describe('ChatBubbleComponent', () => {
  let component: ChatBubbleComponent;
  let fixture: ComponentFixture<ChatBubbleComponent>;

  const userMessage: ChatMessage = {
    type: 'user',
    content: 'Hello, how are you?',
    timestamp: new Date('2024-01-15T10:30:00'),
  };

  const assistantMessage: ChatMessage = {
    type: 'assistant',
    content: 'I am doing well, thank you!',
    timestamp: new Date('2024-01-15T10:30:15'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatBubbleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatBubbleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('message', userMessage);
    fixture.componentRef.setInput('userName', 'John Doe');
    fixture.componentRef.setInput('userInitials', 'JD');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Input signals', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('message', userMessage);
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('userInitials', 'JD');
    });

    it('should accept required message input', () => {
      expect(component.message()).toEqual(userMessage);
    });

    it('should accept required userName input', () => {
      expect(component.userName()).toBe('John Doe');
    });

    it('should accept required userInitials input', () => {
      expect(component.userInitials()).toBe('JD');
    });

    it('should accept optional style inputs', () => {
      fixture.componentRef.setInput('bgColor', 'bg-blue-500');
      fixture.componentRef.setInput('textColor', 'text-white');
      fixture.componentRef.setInput('fontSize', 'text-lg');

      expect(component.bgColor()).toBe('bg-blue-500');
      expect(component.textColor()).toBe('text-white');
      expect(component.fontSize()).toBe('text-lg');
    });

    it('should use default style values', () => {
      expect(component.bgColor()).toBe('');
      expect(component.textColor()).toBe('');
      expect(component.fontSize()).toBe('text-sm');
    });
  });

  describe('formatTime', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('message', userMessage);
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('userInitials', 'JD');
    });

    it('should format time correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = component.formatTime(date);

      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should handle different timestamps', () => {
      const morning = new Date('2024-01-15T09:15:00');
      const afternoon = new Date('2024-01-15T14:45:00');

      expect(component.formatTime(morning)).toBeTruthy();
      expect(component.formatTime(afternoon)).toBeTruthy();
    });
  });

  describe('User message rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('message', userMessage);
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('userInitials', 'JD');
      fixture.detectChanges();
    });

    it('should render user message with chat-start class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatElement = compiled.querySelector('.chat-start');
      expect(chatElement).toBeTruthy();
    });

    it('should display user name in chat header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatHeader = compiled.querySelector('.chat-header');
      expect(chatHeader?.textContent).toContain('John Doe');
    });

    it('should display user initials in avatar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const avatar = compiled.querySelector('.avatar');
      expect(avatar?.textContent?.trim()).toBe('JD');
    });

    it('should display message content', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.textContent?.trim()).toBe('Hello, how are you?');
    });

    it('should display timestamp', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const time = compiled.querySelector('time');
      expect(time).toBeTruthy();
    });

    it('should apply custom background color', () => {
      fixture.componentRef.setInput('bgColor', 'bg-blue-500');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.classList.contains('bg-blue-500')).toBe(true);
    });

    it('should apply custom text color', () => {
      fixture.componentRef.setInput('textColor', 'text-white');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.classList.contains('text-white')).toBe(true);
    });

    it('should apply custom font size', () => {
      fixture.componentRef.setInput('fontSize', 'text-lg');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.classList.contains('text-lg')).toBe(true);
    });
  });

  describe('Assistant message rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('message', assistantMessage);
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('userInitials', 'JD');
      fixture.detectChanges();
    });

    it('should render assistant message with chat-end class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatElement = compiled.querySelector('.chat-end');
      expect(chatElement).toBeTruthy();
    });

    it('should display Assistant label in chat header', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatHeader = compiled.querySelector('.chat-header');
      expect(chatHeader?.textContent).toContain('Assistant');
    });

    it('should display assistant SVG icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const svg = compiled.querySelector('.chat-end svg');
      expect(svg).toBeTruthy();
    });

    it('should display message content', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.textContent?.trim()).toBe('I am doing well, thank you!');
    });

    it('should display timestamp', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const time = compiled.querySelector('time');
      expect(time).toBeTruthy();
    });

    it('should apply custom styles', () => {
      fixture.componentRef.setInput('bgColor', 'bg-gray-500');
      fixture.componentRef.setInput('textColor', 'text-white');
      fixture.componentRef.setInput('fontSize', 'text-base');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const chatBubble = compiled.querySelector('.chat-bubble');
      expect(chatBubble?.classList.contains('bg-gray-500')).toBe(true);
      expect(chatBubble?.classList.contains('text-white')).toBe(true);
      expect(chatBubble?.classList.contains('text-base')).toBe(true);
    });
  });
});
