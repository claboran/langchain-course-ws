import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { IngestSplitterService } from './ingest-splitter.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { IngestDocument } from './ingest.model';


interface IngestResult {
  totalIngested: number;
  batchesProcessed: number;
  timeElapsed: number;
}

@Injectable()
export class IngestService {
  private readonly BATCH_SIZE = 100;
  private readonly INPUT_PATH = 'data/prepared-products.json';
  readonly #logger = new Logger(IngestService.name);

  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly ingestSplitterService: IngestSplitterService,
  ) {}

  async ingestProducts(): Promise<IngestResult> {
    const startTime = Date.now();

    this.#logger.log(`Loading documents from: ${this.INPUT_PATH}`);
    this.#logger.debug(`Batch size configured: ${this.BATCH_SIZE}`);

    const documents = await this.loadDocuments();
    this.#logger.log(`Loaded ${documents.length} documents`);
    this.#logger.debug(`Document sample (first 3): ${JSON.stringify(documents.slice(0, 3).map(d => ({ id: d.metadata.id, category: d.metadata.category })))}`);

    // Split documents into smaller chunks
    const chunks = await this.splitDocuments(documents);
    this.#logger.log(
      `Created ${chunks.length} chunks from ${documents.length} documents`,
    );

    // First, clear existing embeddings to ensure fresh data
    this.#logger.log('Clearing existing embeddings...');
    await this.vectorStoreService.clearAllEmbeddings();

    this.#logger.log(`Processing in batches of ${this.BATCH_SIZE}...`);
    const { batchesProcessed, totalIngested } =
      await this.processAllBatches(chunks);

    const timeElapsed = Date.now() - startTime;

    this.#logger.debug(`Ingestion statistics: ${JSON.stringify({ totalIngested, batchesProcessed, timeElapsed })}`);

    return {
      totalIngested,
      batchesProcessed,
      timeElapsed,
    };
  }

  private async processAllBatches(chunks: IngestDocument[]): Promise<{
    batchesProcessed: number;
    totalIngested: number;
  }> {
    // Get the singleton vector store instance
    const vectorStore = await this.vectorStoreService.getVectorStore();

    // Process chunks in batches
    const batches = this.createBatches(chunks);
    this.#logger.debug(`Created ${batches.length} batches from ${chunks.length} chunks`);

    return batches.reduce(
      async (prev, batch, idx) => {
        const acc = await prev;
        const batchNumber = idx + 1;
        const totalBatches = batches.length;
        const batchStartTime = Date.now();

        this.#logger.log(
          `Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`,
        );
        this.#logger.debug(`Batch ${batchNumber} document IDs: ${batch.map(d => d.metadata.id).join(', ')}`);

        try {
          await this.ingestBatch(vectorStore, batch);

          const batchTime = Date.now() - batchStartTime;
          const currentTotalIngested = acc.totalIngested + batch.length;

          this.#logger.log(
            `Batch ${batchNumber} complete (${currentTotalIngested}/${chunks.length} total) - ${batchTime}ms`,
          );
          this.#logger.debug(`Batch ${batchNumber} average time per chunk: ${(batchTime / batch.length).toFixed(2)}ms`);

          return {
            batchesProcessed: acc.batchesProcessed + 1,
            totalIngested: currentTotalIngested,
          };
        } catch (error) {
          this.#logger.error(`Failed to process batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      },
      Promise.resolve({ batchesProcessed: 0, totalIngested: 0 }),
    );
  }

  private createBatches(chunks: IngestDocument[]): IngestDocument[][] {
    return Array.from(
      { length: Math.ceil(chunks.length / this.BATCH_SIZE) },
      (_, i) => chunks.slice(i * this.BATCH_SIZE, (i + 1) * this.BATCH_SIZE),
    );
  }

  private async loadDocuments(): Promise<IngestDocument[]> {
    return JSON.parse(await readFile(this.INPUT_PATH, 'utf-8'));
  }

  private async splitDocuments(
    documents: IngestDocument[],
  ): Promise<IngestDocument[]> {
    return this.ingestSplitterService.createChunks(documents);
  }

  private async ingestBatch(
    vectorStore: PGVectorStore,
    documents: IngestDocument[],
  ): Promise<void> {
    // Add documents to the existing vector store (reuses connection pool)
    await vectorStore.addDocuments(documents);
  }
}
