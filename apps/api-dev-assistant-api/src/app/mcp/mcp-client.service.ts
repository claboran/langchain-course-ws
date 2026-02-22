import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type {
  ListToolsResult,
  ListPromptsResult,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// JSON Schema → Zod converter (covers the subset used in MCP tool schemas)
// ---------------------------------------------------------------------------

function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') return z.any();

  // Handle enum before type switch
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const [first, ...rest] = schema.enum as string[];
    return z.enum([first, ...rest]);
  }

  switch (schema.type) {
    case 'string': {
      let s = z.string();
      if (schema.description) s = s.describe(schema.description);
      if (typeof schema.minLength === 'number') s = s.min(schema.minLength);
      if (typeof schema.maxLength === 'number') s = s.max(schema.maxLength);
      return s;
    }
    case 'number':
    case 'integer': {
      let n = z.number();
      if (schema.description) n = n.describe(schema.description);
      return n;
    }
    case 'boolean':
      return z.boolean();
    case 'array': {
      const items = schema.items ? jsonSchemaToZod(schema.items) : z.any();
      return z.array(items);
    }
    case 'object': {
      const shape: Record<string, z.ZodTypeAny> = {};
      const required = new Set<string>(schema.required ?? []);
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        const field = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? field : field.optional();
      }
      return z.object(shape);
    }
    default:
      return z.any();
  }
}

/**
 * MCP Client Service
 * Manages connections to MCP servers and provides tool/prompt access
 */
@Injectable()
export class MCPClientService implements OnModuleInit {
  readonly #logger = new Logger(MCPClientService.name);
  readonly #clients = new Map<string, Client>();
  readonly #tools = new Map<string, { server: string; tool: any }>();

  async onModuleInit() {
    const servers = this.loadServerConfigs();
    await this.connectToServers(servers);
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  private loadServerConfigs(): MCPServerConfig[] {
    const configStr = process.env.MCP_SERVERS_CONFIG;
    if (!configStr) {
      this.#logger.warn('No MCP_SERVERS_CONFIG found in environment');
      return [];
    }

    try {
      const config = JSON.parse(configStr);
      return Array.isArray(config) ? config : [];
    } catch (error) {
      this.#logger.error('Failed to parse MCP_SERVERS_CONFIG', error);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  private async connectToServers(configs: MCPServerConfig[]): Promise<void> {
    for (const config of configs) {
      try {
        await this.connectToServer(config);
        this.#logger.log(`Connected to MCP server: ${config.name}`);
      } catch (error) {
        this.#logger.error(`Failed to connect to MCP server ${config.name}`, error);
      }
    }
  }

  private async connectToServer(config: MCPServerConfig): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: config.env,
    });

    const client = new Client(
      { name: 'api-dev-assistant', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    this.#clients.set(config.name, client);
    await this.loadToolsFromServer(config.name, client);
  }

  private async loadToolsFromServer(serverName: string, client: Client): Promise<void> {
    try {
      const result: ListToolsResult = await client.listTools();
      for (const tool of result.tools) {
        const toolKey = `${serverName}__${tool.name}`;
        this.#tools.set(toolKey, { server: serverName, tool });
        this.#logger.debug(`Registered tool: ${toolKey} — ${tool.description ?? 'no description'}`);
      }
    } catch (error) {
      this.#logger.error(`Failed to load tools from ${serverName}`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Tools
  // ---------------------------------------------------------------------------

  /**
   * Return all MCP tools as typed LangChain DynamicStructuredTool instances.
   * Each tool's inputSchema (JSON Schema) is converted to a Zod schema so the
   * model receives proper structured input validation.
   */
  getLangChainTools(): DynamicStructuredTool[] {
    return Array.from(this.#tools.entries()).map(([toolKey, { server, tool }]) => {
      const zodSchema = jsonSchemaToZod(tool.inputSchema ?? { type: 'object', properties: {} });

      return new DynamicStructuredTool({
        name: toolKey,
        description: tool.description ?? `Tool from ${server}`,
        schema: zodSchema as z.ZodObject<any>,
        func: async (input: Record<string, unknown>) =>
          this.callTool(server, tool.name, input),
      });
    });
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const client = this.#clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    const result = await client.callTool({ name: toolName, arguments: args });

    if (Array.isArray(result.content)) {
      return result.content
        .map((item: any) => (item.type === 'text' ? item.text : JSON.stringify(item)))
        .join('\n');
    }

    return JSON.stringify(result.content);
  }

  getAvailableTools(): Array<{ name: string; description: string; server: string }> {
    return Array.from(this.#tools.entries()).map(([key, { server, tool }]) => ({
      name: key,
      description: tool.description ?? '',
      server,
    }));
  }

  // ---------------------------------------------------------------------------
  // Prompts
  // ---------------------------------------------------------------------------

  async listPrompts(
    serverName?: string
  ): Promise<Array<{ server: string; name: string; description?: string }>> {
    const targets = serverName
      ? [[serverName, this.#clients.get(serverName)] as const].filter(([, c]) => c)
      : Array.from(this.#clients.entries());

    const results: Array<{ server: string; name: string; description?: string }> = [];

    for (const [name, client] of targets) {
      try {
        const res: ListPromptsResult = await client!.listPrompts();
        for (const p of res.prompts) {
          results.push({ server: name, name: p.name, description: p.description });
        }
      } catch (error) {
        this.#logger.error(`Failed to list prompts from ${name}`, error);
      }
    }

    return results;
  }

  async getPrompt(
    serverName: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<GetPromptResult | null> {
    const client = this.#clients.get(serverName);
    if (!client) {
      this.#logger.warn(`MCP server not connected: ${serverName}`);
      return null;
    }

    try {
      return await client.getPrompt({ name: promptName, arguments: args });
    } catch (error) {
      this.#logger.error(`Failed to get prompt ${promptName} from ${serverName}`, error);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onModuleDestroy() {
    for (const [name, client] of this.#clients.entries()) {
      try {
        await client.close();
        this.#logger.log(`Disconnected from MCP server: ${name}`);
      } catch (error) {
        this.#logger.error(`Error disconnecting from ${name}`, error);
      }
    }
    this.#clients.clear();
    this.#tools.clear();
  }
}
