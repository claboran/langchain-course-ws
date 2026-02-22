#!/usr/bin/env node

import Redis from 'ioredis';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SpecsStore } from './resources/specs-store.js';
import { ResourceManager } from './resources/resource-manager.js';
import { ToolManager } from './tools/tool-manager.js';
import { PromptManager } from './prompts/prompt-manager.js';

async function main() {
  // Initialize Redis and SpecsStore before any manager is constructed
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: false,
  });

  redis.on('error', (err) => console.error('Redis error:', err));

  SpecsStore.initialize(redis);

  // Create MCP server instance
  const server = new Server(
    { name: 'api-dev-mcp-server', version: '1.0.0' },
    { capabilities: { resources: {}, tools: {}, prompts: {} } }
  );

  // Initialize managers (all now share the Redis-backed SpecsStore singleton)
  const resourceManager = new ResourceManager();
  const toolManager = new ToolManager();
  const promptManager = new PromptManager();

  // Register all handlers
  resourceManager.register(server);
  toolManager.register(server);
  promptManager.register(server);

  // Create stdio transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('🚀 API Development MCP Server running on stdio');
  console.error('📋 Capabilities: resources, tools, prompts');
  console.error(`💾 Specs persisted to Redis (${process.env.REDIS_URL ?? 'redis://localhost:6379'})`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
