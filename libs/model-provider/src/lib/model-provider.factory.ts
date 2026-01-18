import { ChatMistralAI } from '@langchain/mistralai';
import { ModelProviderConfig } from './model-provider.config';
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from './model-provider.constants';

export const createChatMistralAI = (config: ModelProviderConfig): ChatMistralAI =>
  new ChatMistralAI({
    model: config.model ?? DEFAULT_MODEL,
    apiKey: config.apiKey,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
  });
