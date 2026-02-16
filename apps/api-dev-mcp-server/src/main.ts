#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ResourceManager } from './resources/resource-manager.js';
import { ToolManager } from './tools/tool-manager.js';
import { PromptManager } from './prompts/prompt-manager.js';

async function main() {
  // Create MCP server instance
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

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect and start server
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('🚀 API Development MCP Server running on stdio');
  console.error('📋 Capabilities: resources, tools, prompts');
}

// Run server
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
