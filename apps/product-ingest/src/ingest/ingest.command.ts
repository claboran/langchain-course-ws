import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { IngestService } from './ingest.service';

@Command({
  name: 'ingest',
  description: 'Ingest product documents and create embeddings in pgvector',
})
export class IngestCommand extends CommandRunner {
  readonly #logger = new Logger(IngestCommand.name);

  constructor(private readonly ingestService: IngestService) {
    super();
  }

  async run(): Promise<void> {
    this.#logger.log('Starting product ingestion pipeline...');

    try {
      const result = await this.ingestService.ingestProducts();

      this.#logger.log('Ingestion complete!');
      this.#logger.log(`Total products ingested: ${result.totalIngested}`);
      this.#logger.log(`Batches processed: ${result.batchesProcessed}`);
      this.#logger.log(`Time elapsed: ${(result.timeElapsed / 1000).toFixed(2)}s`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.#logger.error(`Ingestion failed: ${errorMessage}`);

      // Log full error details to file
      if (error instanceof Error && error.stack) {
        this.#logger.debug(`Error stack trace: ${error.stack}`);
      }

      throw error;
    }
  }
}
