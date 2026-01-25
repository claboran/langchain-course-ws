import { ChatMessage as StoreMessage } from './chat.store';
import { ChatMessage as LibraryMessage } from '@langchain-course-ws/chat-components';

/**
 * Message Mapper
 *
 * Adapts between the ChatStore message format and the library's ChatComponent message format.
 *
 * Store format: LibraryChatMessage & { id: string }
 * - Extends library format with `id` for optimistic update tracking
 *
 * Library format: ChatMessage
 * - Just the display fields (type, content, timestamp, isMarkdown, confidence)
 *
 * The mapping is simple: just omit the `id` field.
 */

/**
 * Convert store messages to library messages
 * Simply strips the `id` field used for rollback tracking
 *
 * @param storeMessages - Messages from ChatStore
 * @returns Messages in library ChatComponent format
 */
export const mapStoreMessagesToLibrary = (
  storeMessages: StoreMessage[],
): LibraryMessage[] =>
  storeMessages.map(({ id, ...libraryMessage }) => libraryMessage);

/**
 * Convert a single store message to library message
 * Simply strips the `id` field used for rollback tracking
 *
 * @param storeMessage - Message from ChatStore
 * @returns Message in library ChatComponent format
 */
export const mapStoreMessageToLibrary = (
  { id, ...libraryMessage }: StoreMessage,
): LibraryMessage => libraryMessage;
