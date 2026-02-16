# MCP Server Deployment Guide

## Transport Options

The MCP server supports two transport modes:

### 1. **Stdio Transport** (Development)
✅ Good for: Local development, testing, single-process integration
❌ Limitations: Same process/container only, no network communication

### 2. **SSE Transport** (Production)
✅ Good for: Docker, Kubernetes, microservices, multiple clients
✅ Network-based, HTTP/HTTPS compatible
✅ Load balancing, horizontal scaling

---

## Stdio vs SSE Comparison

| Feature | Stdio | SSE (HTTP) |
|---------|-------|------------|
| **Network** | ❌ No | ✅ Yes |
| **Docker/K8s** | ❌ Same container only | ✅ Separate services |
| **Multiple clients** | ❌ Single client | ✅ Multiple clients |
| **Load balancing** | ❌ No | ✅ Yes |
| **Horizontal scaling** | ❌ No | ✅ Yes |
| **HTTPS/TLS** | ❌ No | ✅ Yes |
| **Development** | ✅ Simple | ⚠️ More setup |
| **Production** | ❌ Not suitable | ✅ Recommended |

---

## Local Development (Stdio)

**Use Case**: Testing MCP server locally or integrating in same process.

\`\`\`bash
# Build and run
npx nx build api-dev-mcp-server
node dist/apps/api-dev-mcp-server/main.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/apps/api-dev-mcp-server/main.js
\`\`\`

**Client Integration (NestJS)**:
\`\`\`typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/apps/api-dev-mcp-server/main.js'],
});

await mcpClient.connect(transport);
\`\`\`

---

## Docker Deployment (SSE)

**Use Case**: Running MCP server as a separate container/service.

### Dockerfile

\`\`\`dockerfile
# apps/api-dev-mcp-server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built server
COPY dist/apps/api-dev-mcp-server ./dist/apps/api-dev-mcp-server

# Expose SSE port
EXPOSE 3100

# Run in SSE mode
CMD ["node", "dist/apps/api-dev-mcp-server/main-sse.js"]
\`\`\`

### Docker Compose

\`\`\`yaml
version: '3.8'

services:
  # MCP Server (standalone service)
  mcp-server:
    build:
      context: .
      dockerfile: apps/api-dev-mcp-server/Dockerfile
    ports:
      - "3100:3100"
    environment:
      - MCP_PORT=3100
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  # NestJS Assistant API (separate service)
  assistant-api:
    build:
      context: .
      dockerfile: apps/api-dev-assistant-api/Dockerfile
    ports:
      - "5000:5000"  # gRPC
      - "3313:3313"  # HTTP
    environment:
      - MCP_SERVER_URL=http://mcp-server:3100
    depends_on:
      mcp-server:
        condition: service_healthy

  # Redis for checkpointing
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
\`\`\`

### Client Integration (NestJS with SSE)

\`\`\`typescript
// apps/api-dev-assistant-api/src/mcp/mcp-client.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MCPClientService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const mcpServerUrl = this.configService.get<string>('MCP_SERVER_URL') || 'http://localhost:3100';

    this.client = new Client(
      {
        name: 'api-dev-assistant',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // SSE transport for HTTP-based communication
    const transport = new SSEClientTransport(
      new URL(\`\${mcpServerUrl}/sse\`)
    );

    await this.client.connect(transport);
    console.log('✅ Connected to MCP server via SSE');
  }

  async callTool(name: string, args: any) {
    return await this.client.callTool({ name, arguments: args });
  }

  async listTools() {
    return await this.client.listTools();
  }

  async readResource(uri: string) {
    return await this.client.readResource({ uri });
  }

  async getPrompt(name: string, args?: any) {
    return await this.client.getPrompt({ name, arguments: args });
  }
}
\`\`\`

---

## Kubernetes Deployment

### MCP Server Deployment

\`\`\`yaml
# k8s/mcp-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-dev-mcp-server
  labels:
    app: api-dev-mcp-server
spec:
  replicas: 3  # Horizontal scaling!
  selector:
    matchLabels:
      app: api-dev-mcp-server
  template:
    metadata:
      labels:
        app: api-dev-mcp-server
    spec:
      containers:
      - name: mcp-server
        image: your-registry/api-dev-mcp-server:latest
        ports:
        - containerPort: 3100
          name: sse
        env:
        - name: MCP_PORT
          value: "3100"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3100
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3100
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-dev-mcp-server
spec:
  selector:
    app: api-dev-mcp-server
  ports:
  - protocol: TCP
    port: 3100
    targetPort: 3100
  type: ClusterIP
\`\`\`

### Assistant API Deployment

\`\`\`yaml
# k8s/assistant-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-dev-assistant-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-dev-assistant-api
  template:
    metadata:
      labels:
        app: api-dev-assistant-api
    spec:
      containers:
      - name: assistant-api
        image: your-registry/api-dev-assistant-api:latest
        ports:
        - containerPort: 5000
          name: grpc
        - containerPort: 3313
          name: http
        env:
        - name: MCP_SERVER_URL
          value: "http://api-dev-mcp-server:3100"
        - name: REDIS_URL
          value: "redis://redis:6379"
\`\`\`

---

## Architecture Diagrams

### Stdio Mode (Development)
\`\`\`
┌─────────────────────────────────┐
│   NestJS Assistant API          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ MCP Client                │  │
│  │   ↓ (stdio)               │  │
│  │ MCP Server subprocess     │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
     Single Container/Process
\`\`\`

### SSE Mode (Production)
\`\`\`
┌──────────────────────┐         ┌──────────────────────┐
│  Assistant API       │         │  MCP Server          │
│  (Container 1)       │ HTTP/   │  (Container 2)       │
│                      │ SSE     │                      │
│  ┌────────────────┐  │ ◄─────► │  ┌────────────────┐  │
│  │ MCP Client     │  │         │  │ MCP Server     │  │
│  │ (SSE Transport)│  │         │  │ (SSE Transport)│  │
│  └────────────────┘  │         │  └────────────────┘  │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │  Can scale independently!       │
         ▼                                  ▼
     Load Balancer                     Load Balancer
\`\`\`

---

## Production Checklist

### Before Deploying MCP Server

- [ ] Build with SSE transport (\`main-sse.ts\`)
- [ ] Add express dependency: \`npm install express\`
- [ ] Configure health check endpoint
- [ ] Set up logging and monitoring
- [ ] Add HTTPS/TLS if exposing publicly
- [ ] Configure CORS if needed
- [ ] Set resource limits (memory, CPU)
- [ ] Add authentication if required
- [ ] Test horizontal scaling
- [ ] Configure load balancer

### Security Considerations

**⚠️ Stdio Mode**: No authentication needed (same process)

**⚠️ SSE Mode**: Add authentication!
\`\`\`typescript
// Add bearer token auth
app.get('/sse', authenticateToken, async (req, res) => {
  // ... MCP server setup
});

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
\`\`\`

---

## Recommendation

**Development**: Use **stdio** mode for simplicity
**Production**: Use **SSE** mode for scalability and containerization

The stdio limitation you identified is real and important for production deployments. SSE transport solves this elegantly while maintaining the same MCP protocol.
