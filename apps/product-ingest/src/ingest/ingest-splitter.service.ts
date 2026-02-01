import { Injectable, Logger } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { IngestDocument } from './ingest.model';

@Injectable()
export class IngestSplitterService {
  readonly #logger = new Logger(IngestSplitterService.name);

  private readonly textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200, // Overlap to maintain context between chunks
    });
  }

  async createChunks(documents: IngestDocument[]): Promise<IngestDocument[]> {
    this.#logger.log('Splitting long documents into chunks...');
    this.#logger.debug(`Text splitter config: chunkSize=2000, chunkOverlap=200`);

    const chunks = await this.textSplitter.createDocuments(
      documents.map((doc) => doc.pageContent),
      documents.map((doc) => doc.metadata),
    );

    this.#logger.log(
      `Created ${chunks.length} chunks from ${documents.length} documents`,
    );
    this.#logger.debug(`Average chunks per document: ${(chunks.length / documents.length).toFixed(2)}`);

    return chunks.map((chunk) => ({
      pageContent: chunk.pageContent,
      metadata: {
        id: chunk.metadata.id,
        category: chunk.metadata.category,
      },
    }));
  }
}
