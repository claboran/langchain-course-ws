import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductEmbeddingsTable1738137600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Create product_embeddings table
    await queryRunner.query(`
      CREATE TABLE product_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding VECTOR(768),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for vector similarity search (using HNSW for better performance)
    await queryRunner.query(`
      CREATE INDEX product_embeddings_embedding_idx
      ON product_embeddings
      USING hnsw (embedding vector_cosine_ops);
    `);

    // Create index on metadata for filtering (GIN index for JSONB)
    await queryRunner.query(`
      CREATE INDEX product_embeddings_metadata_idx
      ON product_embeddings USING GIN (metadata);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS product_embeddings_metadata_idx;`);
    await queryRunner.query(`DROP INDEX IF EXISTS product_embeddings_embedding_idx;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_embeddings;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector;`);
  }
}
