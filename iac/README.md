# Infrastructure Setup

This folder contains Docker Compose configurations for the LangChain product ingestion pipeline.

## Components

### 1. PostgreSQL with pgvector (`docker-compose.postgres.yml`)

Vector database for storing product embeddings.

**Start:**
```bash
docker-compose -f iac/docker-compose.postgres.yml up -d
```

**Stop:**
```bash
docker-compose -f iac/docker-compose.postgres.yml down
```

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `langchain`
- User: `postgres`
- Password: `postgres`

### 2. Nginx Proxy for Ollama (`docker-compose.nginx.yml`)

**WSL2 Only**: Proxy to access Ollama running on Windows host.

**Prerequisites:**
- Ollama running on Windows host (port 11434)
- Update Ollama to latest version

**Start:**
```bash
docker-compose -f iac/docker-compose.nginx.yml up -d
```

**Stop:**
```bash
docker-compose -f iac/docker-compose.nginx.yml down
```

**Access:**
- Proxy endpoint: `http://localhost:11435`
- Forwards to Windows host: `host.docker.internal:11434`

**Note:** This proxy is only needed for WSL2 environments. If running directly on Linux/macOS with Ollama installed locally, you can skip this and connect directly to `http://localhost:11434`.

## Environment Variables

Add to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/langchain

# Ollama (via proxy for WSL2)
OLLAMA_BASE_URL=http://localhost:11435
```
