import { OllamaEmbeddings } from '@langchain/ollama';
import { EmbeddingProviderConfig } from './embedding-provider.config';
import { DEFAULT_EMBEDDING_MODEL } from './embedding-provider.constants';

export const createOllamaEmbeddings = (config: EmbeddingProviderConfig): OllamaEmbeddings =>
  new OllamaEmbeddings({
    model: config.model ?? DEFAULT_EMBEDDING_MODEL,
    baseUrl: config.baseUrl,
  });
