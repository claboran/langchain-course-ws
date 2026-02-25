#!/usr/bin/env node

/**
 * MCP Server with SSE (Server-Sent Events) transport
 * This version can run as a standalone HTTP service, perfect for Docker/K8s
 */

import Redis from 'ioredis';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { SpecsStore } from './resources/specs-store.js';
import { ResourceManager } from './resources/resource-manager.js';
import { ToolManager } from './tools/tool-manager.js';
import { PromptManager } from './prompts/prompt-manager.js';
import express from 'express';

const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3100;
const HOST = process.env.MCP_HOST ?? '0.0.0.0';

async function main() {
  // Initialize Redis-backed SpecsStore once for all SSE connections
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redis.on('error', (err) => console.error('Redis error:', err));
  SpecsStore.initialize(redis);

  const app = express();

  // Enable JSON parsing for POST requests
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      server: 'api-dev-mcp-server',
      version: '1.0.0',
      transport: 'sse',
      uptime: process.uptime(),
    });
  });

  // SSE endpoint for MCP protocol
  app.get('/sse', async (req, res) => {
    console.error('📡 New SSE connection from:', req.ip);

    // Create a new MCP server instance for this connection
    const server = new Server(
      {
        name: 'api-dev-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    // Initialize managers
    const resourceManager = new ResourceManager();
    const toolManager = new ToolManager();
    const promptManager = new PromptManager();

    // Register all handlers
    resourceManager.register(server);
    toolManager.register(server);
    promptManager.register(server);

    // Create SSE transport
    const transport = new SSEServerTransport('/message', res);

    // Handle client disconnect
    req.on('close', () => {
      console.error('❌ Client disconnected:', req.ip);
      transport.close();
    });

    // Connect server to transport
    await server.connect(transport);
    console.error('✅ MCP server connected via SSE for', req.ip);
  });

  // POST endpoint for client messages (required by SSE transport)
  app.post('/message', async (req, res) => {
    // The SSEServerTransport handles this internally
    // We just need to accept the POST and let the transport process it
    res.status(202).send();
  });

  // Start HTTP server
  app.listen(PORT, HOST, () => {
    console.error('╔════════════════════════════════════════════════════════╗');
    console.error('║   🚀 API Development MCP Server (SSE Mode)            ║');
    console.error('╚════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(`📡 HTTP Server:    http://${HOST}:${PORT}`);
    console.error(`🔗 SSE Endpoint:   http://${HOST}:${PORT}/sse`);
    console.error(`💚 Health Check:   http://${HOST}:${PORT}/health`);
    console.error('');
    console.error('📋 Capabilities:   Resources, Tools, Prompts');
    console.error('🌐 Transport:      Server-Sent Events (SSE)');
    console.error('💾 Persistence:    Redis specs store');
    console.error('🐳 Docker/K8s:     ✅ Ready');
    console.error('');
  });
}

// Run server
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
