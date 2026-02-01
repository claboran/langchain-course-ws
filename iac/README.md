# Infrastructure Setup

This folder contains Docker Compose configurations for local development infrastructure supporting the e-commerce assistant and product ingestion pipeline.

## 📋 Overview

The infrastructure consists of two main components:
1. **PostgreSQL with pgvector**: Vector database for semantic product search
2. **Nginx Proxy for Ollama**: (WSL2 only) Proxy to access Ollama running on Windows host

## 🐘 PostgreSQL with pgvector

### What It Does

Provides a PostgreSQL 16 database with the pgvector extension for storing and querying vector embeddings. This enables semantic search over product catalogs using cosine similarity.

**Configuration**: `docker-compose.postgres.yml`

### Starting the Database

```bash
# Start PostgreSQL
docker-compose -f iac/docker-compose.postgres.yml up -d

# View logs
docker-compose -f iac/docker-compose.postgres.yml logs -f

# Stop PostgreSQL
docker-compose -f iac/docker-compose.postgres.yml down

# Stop and remove volumes (clears all data)
docker-compose -f iac/docker-compose.postgres.yml down -v
```

### Connection Details

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `langchain` |
| User | `postgres` |
| Password | `postgres` |
| Connection String | `postgresql://postgres:postgres@localhost:5432/langchain` |

### Accessing the Database

```bash
# Using psql (if installed)
psql postgresql://postgres:postgres@localhost:5432/langchain

# Using Docker exec
docker exec -it langchain-postgres psql -U postgres -d langchain

# Example queries
SELECT COUNT(*) FROM product_embeddings;
SELECT category, COUNT(*) FROM product_embeddings GROUP BY category;
```

### Database Schema

The database contains:
- **Table**: `product_embeddings`
  - `id` (UUID): Product identifier
  - `category` (TEXT): Product category
  - `content` (TEXT): Product description
  - `embedding` (VECTOR(768)): Vector embedding
  - `created_at` (TIMESTAMP): Record creation time

- **Indexes**:
  - HNSW index on `embedding` for fast similarity search
  - B-tree index on `category` for filtering

## 🔄 Nginx Proxy for Ollama

### What It Does

**WSL2 ONLY**: Provides a proxy to access Ollama running on the Windows host from within WSL2 Docker containers. This is necessary because WSL2 Docker containers cannot directly access `localhost` on the Windows host.

**Configuration**: `docker-compose.nginx.yml`

### When You Need This

- ✅ You're using WSL2 on Windows
- ✅ Ollama is running on your Windows host (not in WSL2)
- ✅ You need the product-ingest pipeline to generate embeddings

### When You DON'T Need This

- ❌ You're on native Linux or macOS
- ❌ Ollama is running directly in WSL2
- ❌ You're only using the chat assistant (doesn't need embeddings)

### Prerequisites

1. Ollama installed and running on Windows host
2. Ollama listening on port 11434
3. Model pulled: `ollama pull nomic-embed-text`

### Starting the Proxy

```bash
# Start Nginx proxy
docker-compose -f iac/docker-compose.nginx.yml up -d

# View logs
docker-compose -f iac/docker-compose.nginx.yml logs -f

# Test connection
curl http://localhost:11435/api/tags

# Stop proxy
docker-compose -f iac/docker-compose.nginx.yml down
```

### Access Details

| Parameter | Value |
|-----------|-------|
| Proxy Endpoint | `http://localhost:11435` |
| Forwards To | `host.docker.internal:11434` |
| Purpose | Access Windows host Ollama from WSL2 containers |

### Troubleshooting

**Connection refused:**
```bash
# Check if Ollama is running on Windows
# In Windows PowerShell/CMD:
ollama list

# Check nginx proxy logs
docker logs ollama-proxy

# Verify nginx is running
docker ps | grep nginx
```

**Wrong URL on Linux/macOS:**
```env
# Use direct connection instead
OLLAMA_BASE_URL=http://localhost:11434
```

## 🔧 Environment Configuration

Add these to your `.env` file in the workspace root:

```env
# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langchain

# Ollama Embeddings
# For WSL2 with Windows host Ollama:
OLLAMA_BASE_URL=http://localhost:11435

# For native Linux/macOS or WSL2 with local Ollama:
# OLLAMA_BASE_URL=http://localhost:11434

# API Ports
PORT=3312                    # E-commerce assistant API
CHAT_API_PORT=3311          # Chat API
```

## 📊 Monitoring

### Check Database Status

```bash
# Container status
docker ps | grep postgres

# Database size
docker exec langchain-postgres psql -U postgres -d langchain -c "
  SELECT pg_size_pretty(pg_database_size('langchain'));
"

# Table statistics
docker exec langchain-postgres psql -U postgres -d langchain -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
  FROM pg_tables
  WHERE schemaname = 'public';
"
```

### Check Ollama Proxy Status

```bash
# Container status
docker ps | grep nginx

# Test API endpoint
curl http://localhost:11435/api/tags

# Check nginx access logs
docker logs ollama-proxy --tail 50
```

## 🗑️ Cleanup

### Remove All Containers and Data

```bash
# Stop and remove PostgreSQL (preserves data)
docker-compose -f iac/docker-compose.postgres.yml down

# Stop and remove PostgreSQL (deletes all data)
docker-compose -f iac/docker-compose.postgres.yml down -v

# Stop and remove Nginx proxy
docker-compose -f iac/docker-compose.nginx.yml down

# Remove all project containers
docker-compose -f iac/docker-compose.postgres.yml down -v
docker-compose -f iac/docker-compose.nginx.yml down
```

## 🚀 Quick Start

```bash
# 1. Start all infrastructure
docker-compose -f iac/docker-compose.postgres.yml up -d
docker-compose -f iac/docker-compose.nginx.yml up -d  # WSL2 only

# 2. Wait for PostgreSQL to be ready
sleep 5

# 3. Run migrations
npm run product-ingest:migrate

# 4. Verify setup
psql postgresql://postgres:postgres@localhost:5432/langchain -c "\dt"
curl http://localhost:11435/api/tags  # WSL2 only

# 5. Ingest products (optional, takes 5-30+ minutes depending on hardware)
npm run product-ingest:build
node dist/apps/product-ingest/main.js ingest
```

## 📚 Related Documentation

- [Product Ingest Pipeline](../apps/product-ingest/README.md) - How to generate embeddings
- [E-Commerce Assistant API](../apps/ecommerce-assistant-api/README.md) - How to use the vector database
- [pgvector Documentation](https://github.com/pgvector/pgvector) - Vector extension details
- [Ollama Documentation](https://ollama.ai/) - Local model hosting

---

**Note**: For production deployments, use managed PostgreSQL services (AWS RDS, Azure Database, Google Cloud SQL) with pgvector support, and consider cloud-hosted embedding services instead of local Ollama.
