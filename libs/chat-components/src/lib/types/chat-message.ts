export type MessageType = 'user' | 'assistant';

export type ChatMessage = {
  type: MessageType;
  content: string;
  timestamp: Date;
};
