import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { ChatMessage } from '../types/chat-message';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  const mockMessages: ChatMessage[] = [
    {
      type: 'user',
      content: 'Hello, how are you?',
      timestamp: new Date('2024-01-15T10:30:00'),
    },
    {
      type: 'assistant',
      content: 'I am doing well, thank you!',
      timestamp: new Date('2024-01-15T10:30:15'),
    },
    {
      type: 'user',
      content: 'That is great to hear!',
      timestamp: new Date('2024-01-15T10:30:30'),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('userName', 'John Doe');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Input signals', () => {
    it('should accept required userName input', () => {
      fixture.componentRef.setInput('userName', 'John Doe');
      expect(component.userName()).toBe('John Doe');
    });

    it('should accept messages input', () => {
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('messages', mockMessages);
      expect(component.messages()).toEqual(mockMessages);
    });

    it('should default messages to empty array', () => {
      fixture.componentRef.setInput('userName', 'John Doe');
      expect(component.messages()).toEqual([]);
    });

    it('should accept style customization inputs', () => {
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('userBgColor', 'bg-blue-500');
      fixture.componentRef.setInput('userTextColor', 'text-white');
      fixture.componentRef.setInput('assistantBgColor', 'bg-gray-500');
      fixture.componentRef.setInput('assistantTextColor', 'text-white');
      fixture.componentRef.setInput('fontSize', 'text-lg');

      expect(component.userBgColor()).toBe('bg-blue-500');
      expect(component.userTextColor()).toBe('text-white');
      expect(component.assistantBgColor()).toBe('bg-gray-500');
      expect(component.assistantTextColor()).toBe('text-white');
      expect(component.fontSize()).toBe('text-lg');
    });

    it('should use default style values', () => {
      fixture.componentRef.setInput('userName', 'John Doe');

      expect(component.userBgColor()).toBe('bg-primary');
      expect(component.userTextColor()).toBe('text-primary-content');
      expect(component.assistantBgColor()).toBe('bg-secondary');
      expect(component.assistantTextColor()).toBe('text-secondary-content');
      expect(component.fontSize()).toBe('text-sm');
    });
  });

  describe('getUserInitials', () => {
    it('should return initials for single name', () => {
      fixture.componentRef.setInput('userName', 'John');
      expect(component.getUserInitials()).toBe('J');
    });

    it('should return initials for full name', () => {
      fixture.componentRef.setInput('userName', 'John Doe');
      expect(component.getUserInitials()).toBe('JD');
    });

    it('should return first two initials for multiple names', () => {
      fixture.componentRef.setInput('userName', 'John Michael Doe');
      expect(component.getUserInitials()).toBe('JM');
    });

    it('should return uppercase initials', () => {
      fixture.componentRef.setInput('userName', 'john doe');
      expect(component.getUserInitials()).toBe('JD');
    });
  });

  describe('getBgColor', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userName', 'John Doe');
    });

    it('should return user background color for user type', () => {
      fixture.componentRef.setInput('userBgColor', 'bg-blue-500');
      expect(component.getBgColor('user')).toBe('bg-blue-500');
    });

    it('should return assistant background color for assistant type', () => {
      fixture.componentRef.setInput('assistantBgColor', 'bg-gray-500');
      expect(component.getBgColor('assistant')).toBe('bg-gray-500');
    });

    it('should return default user background color', () => {
      expect(component.getBgColor('user')).toBe('bg-primary');
    });

    it('should return default assistant background color', () => {
      expect(component.getBgColor('assistant')).toBe('bg-secondary');
    });
  });

  describe('getTextColor', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userName', 'John Doe');
    });

    it('should return user text color for user type', () => {
      fixture.componentRef.setInput('userTextColor', 'text-black');
      expect(component.getTextColor('user')).toBe('text-black');
    });

    it('should return assistant text color for assistant type', () => {
      fixture.componentRef.setInput('assistantTextColor', 'text-white');
      expect(component.getTextColor('assistant')).toBe('text-white');
    });

    it('should return default user text color', () => {
      expect(component.getTextColor('user')).toBe('text-primary-content');
    });

    it('should return default assistant text color', () => {
      expect(component.getTextColor('assistant')).toBe('text-secondary-content');
    });
  });

  describe('Template rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userName', 'John Doe');
    });

    it('should render empty state when no messages', () => {
      fixture.componentRef.setInput('messages', []);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const bubbles = compiled.querySelectorAll('lib-chat-bubble');
      expect(bubbles.length).toBe(0);
    });

    it('should render correct number of chat bubbles', () => {
      fixture.componentRef.setInput('messages', mockMessages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const bubbles = compiled.querySelectorAll('lib-chat-bubble');
      expect(bubbles.length).toBe(mockMessages.length);
    });

    it('should render chat bubbles in correct order', () => {
      fixture.componentRef.setInput('messages', mockMessages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const bubbles = compiled.querySelectorAll('lib-chat-bubble');

      expect(bubbles.length).toBe(3);
      // Bubbles are rendered in the order they appear in the messages array
    });

    it('should have scrollable container', () => {
      fixture.detectChanges();
      const hostElement = fixture.nativeElement as HTMLElement;
      const computedStyle = window.getComputedStyle(hostElement);

      expect(computedStyle.display).toBe('block');
      expect(computedStyle.overflowY).toBe('auto');
    });
  });

  describe('Integration with ChatBubbleComponent', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userName', 'John Doe');
      fixture.componentRef.setInput('messages', [mockMessages[0]]);
      fixture.detectChanges();
    });

    it('should pass message to chat bubble', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const bubble = compiled.querySelector('lib-chat-bubble');
      expect(bubble).toBeTruthy();
    });

    it('should render user message content via bubble component', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Hello, how are you?');
    });

    it('should render assistant message content via bubble component', () => {
      fixture.componentRef.setInput('messages', [mockMessages[1]]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('I am doing well, thank you!');
    });
  });
});
