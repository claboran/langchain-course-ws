export type MessageType = 'user' | 'assistant';

export type ChatMessage = {
  type: MessageType;
  content: string;
  timestamp: Date;
  isMarkdown?: boolean; // Optional flag to render content as markdown
  confidence?: number; // AI confidence score (0-1) for assistant messages
};
