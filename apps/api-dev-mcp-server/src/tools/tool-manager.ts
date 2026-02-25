import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CreateSpecTool } from './create-spec.tool.js';
import { ValidateSpecTool } from './validate-spec.tool.js';
import { AddEndpointTool } from './add-endpoint.tool.js';
import { ListSpecsTool } from './list-specs.tool.js';
import { GetSpecTool } from './get-spec.tool.js';
import { SpecsStore } from '../resources/specs-store.js';

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  execute(args: unknown): Promise<any>;
}

export class ToolManager {
  private tools: Map<string, Tool>;

  constructor() {
    const specsStore = SpecsStore.getInstance();

    this.tools = new Map<string, Tool>([
      ['create_openapi_spec', new CreateSpecTool(specsStore)],
      ['validate_openapi_spec', new ValidateSpecTool(specsStore)],
      ['add_endpoint', new AddEndpointTool(specsStore)],
      ['list_specs', new ListSpecsTool(specsStore)],
      ['get_spec', new GetSpecTool(specsStore)],
    ]);
  }

  register(server: Server) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      return { tools };
    });

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
