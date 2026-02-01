import { Document } from '@langchain/core/documents';

export type IngestDocument = Document<{
  id: string;
  category: string;
}>;
