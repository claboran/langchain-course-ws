import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestCommand } from './ingest.command';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { IngestSplitterService } from './ingest-splitter.service';

@Module({
  imports: [VectorStoreModule],
  providers: [IngestService, IngestCommand, IngestSplitterService],
  exports: [IngestService, IngestCommand],
})
export class IngestModule {}
