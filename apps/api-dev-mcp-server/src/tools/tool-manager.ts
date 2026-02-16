import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CreateSpecTool } from './create-spec.tool.js';
import { ValidateSpecTool } from './validate-spec.tool.js';
import { AddEndpointTool } from './add-endpoint.tool.js';
import { SpecsStore } from '../resources/specs-store.js';

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  execute(args: unknown): Promise<any>;
}

export class ToolManager {
  private tools: Map<string, Tool>;
  private specsStore: SpecsStore;

  constructor() {
    this.specsStore = SpecsStore.getInstance();

    // Initialize tools
    this.tools = new Map<string, Tool>([
      ['create_openapi_spec', new CreateSpecTool(this.specsStore)],
      ['validate_openapi_spec', new ValidateSpecTool(this.specsStore)],
      ['add_endpoint', new AddEndpointTool(this.specsStore)],
    ]);
  }

  register(server: Server) {
    // List all available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      return { tools };
    });

    // Call a specific tool
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const tool = this.tools.get(toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      return await tool.execute(request.params.arguments);
    });
  }
}
