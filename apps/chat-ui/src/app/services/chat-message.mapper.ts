import { ChatMessage as StoreMessage } from './chat.store';
import { ChatMessage as LibraryMessage } from '@langchain-course-ws/chat-components';

/**
 * Message Mapper
 *
 * Adapts between the ChatStore message format and the library's ChatComponent message format.
 *
 * Store format includes an `id` field and uses `role`, while the library format
 * uses `type` without an id field.
 */

/**
 * Convert store messages to library messages
 *
 * @param storeMessages - Messages from ChatStore
 * @returns Messages in library ChatComponent format
 */
export const mapStoreMessagesToLibrary = (
  storeMessages: StoreMessage[],
): LibraryMessage[] =>
  storeMessages.map((message) => ({
    type: message.role, // 'role' in store maps to 'type' in library
    content: message.content,
    timestamp: message.timestamp,
    isMarkdown: message.isMarkdown, // Preserve markdown flag
  }));

/**
 * Convert a single store message to library message
 *
 * @param storeMessage - Message from ChatStore
 * @returns Message in library ChatComponent format
 */
export const mapStoreMessageToLibrary = (
  storeMessage: StoreMessage,
): LibraryMessage => ({
  type: storeMessage.role,
  content: storeMessage.content,
  timestamp: storeMessage.timestamp,
  isMarkdown: storeMessage.isMarkdown, // Preserve markdown flag
});
