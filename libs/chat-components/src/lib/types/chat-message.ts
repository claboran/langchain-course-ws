export type MessageType = 'user' | 'assistant';

export type ChatMessage = {
  type: MessageType;
  content: string;
  timestamp: Date;
  isMarkdown?: boolean; // Optional flag to render content as markdown
};
