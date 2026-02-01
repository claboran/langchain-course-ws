# Product Ingest Pipeline

A NestJS CLI application for ingesting product documents and creating vector embeddings in pgvector for semantic search.

## Overview

This pipeline transforms raw product data into searchable vector embeddings, enabling the e-commerce assistant to understand and retrieve products based on natural language queries. It's the foundational step for building semantic product search capabilities.

## Features

- **Document Loading**: Loads pre-cleaned product data in LangChain Document format
- **Embedding Generation**: Uses Ollama (nomic-embed-text) to create 768-dimensional embeddings
- **Vector Storage**: Stores embeddings in PostgreSQL with pgvector extension and HNSW indexing
- **Batch Processing**: Efficiently processes 27,752 products in batches of 100
- **Data Source**: Product catalog in `data/prepared-products.json` (pre-cleaned and formatted)

## Prerequisites

1. **Docker**: For running PostgreSQL and Nginx proxy
2. **Ollama**: Running on Windows host (for WSL2) with nomic-embed-text model pulled
3. **Node.js**: For running the application

## Setup

### 1. Start Infrastructure

Start PostgreSQL with pgvector:
```bash
docker-compose -f iac/docker-compose.postgres.yml up -d
```

Start Ollama proxy (WSL2 only):
```bash
docker-compose -f iac/docker-compose.nginx.yml up -d
```

### 2. Configure Environment

Ensure your `.env` file contains:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langchain
OLLAMA_BASE_URL=http://localhost:11435
```

### 3. Run Database Migration

Create the product_embeddings table:
```bash
npm run product-ingest:migrate
```

## Usage

### Build the Application

```bash
npm run product-ingest:build
```

### Run Ingestion

```bash
node dist/apps/product-ingest/main.js ingest
```

This will:
1. Load 27,752 product documents from `data/prepared-products.json`
2. Clear existing embeddings (ensures fresh data on re-run)
3. Process documents in batches of 100
4. Generate embeddings using Ollama (nomic-embed-text)
5. Store in pgvector with metadata (id, category)

**Expected Output:**
```
Starting product ingestion pipeline...

Loading documents from: data/prepared-products.json
Loaded 27752 documents
Clearing existing embeddings...
Processing in batches of 100...

Processing batch 1/278 (100 products)...
  ✓ Batch 1 complete (100/27752 total)
...

✓ Ingestion complete!
  • Total products ingested: 27752
  • Batches processed: 278
  • Time elapsed: ~XXXXXXms
```

## Database Schema

```sql
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX product_embeddings_embedding_idx
  ON product_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX product_embeddings_category_idx
  ON product_embeddings (category);
```

## Architecture

- **Data Source**: `data/prepared-products.json` (pre-cleaned, deduplicated)
- **Embedding Model**: Ollama nomic-embed-text (768 dimensions)
- **Vector Database**: PostgreSQL 16 + pgvector extension
- **Storage**: HNSW index for fast cosine similarity search

## Troubleshooting

### Ollama Connection Issues (WSL2)

If embeddings fail with connection errors:
1. Verify Ollama is running on Windows: `ollama list`
2. Check nginx proxy: `docker logs ollama-proxy`
3. Test connection: `curl http://localhost:11435/api/tags`

### Database Connection Issues

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify DATABASE_URL in .env
3. Test connection: `psql postgresql://postgres:postgres@localhost:5432/langchain`

### Migration Issues

To revert the migration:
```bash
npm run product-ingest:migrate:revert
```

Then run it again:
```bash
npm run product-ingest:migrate
```
