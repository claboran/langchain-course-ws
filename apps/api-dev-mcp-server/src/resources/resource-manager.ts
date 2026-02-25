import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SpecsStore } from './specs-store.js';
import { API_DESIGN_PATTERNS_CONTENT } from '../content/patterns.js';
import { ERROR_HANDLING_GUIDE_CONTENT } from '../content/error-handling.js';

export class ResourceManager {
  private specsStore: SpecsStore;

  constructor() {
    this.specsStore = SpecsStore.getInstance();
  }

  register(server: Server) {
    // List all available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];

      // Dynamic resources for each OpenAPI spec
      const specs = await this.specsStore.list();
      for (const { id, spec } of specs) {
        resources.push({
          uri: `openapi://spec/${id}`,
          name: `OpenAPI Spec: ${spec.info?.title || id}`,
          mimeType: 'application/json',
          description: spec.info?.description || 'API specification',
        });
      }

      // Static resources
      resources.push({
        uri: 'patterns://rest-api-design',
        name: 'REST API Design Patterns',
        mimeType: 'text/markdown',
        description: 'Best practices and patterns for REST API design',
      });

      resources.push({
        uri: 'patterns://error-handling',
        name: 'API Error Handling Guide',
        mimeType: 'text/markdown',
        description: 'Error handling best practices for REST APIs',
      });

      return { resources };
    });

    // Read a specific resource
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      // Handle OpenAPI spec resources
      if (uri.startsWith('openapi://spec/')) {
        const id = uri.replace('openapi://spec/', '');
        const spec = await this.specsStore.get(id);

        if (!spec) {
          throw new Error(`OpenAPI spec with ID "${id}" not found`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(spec, null, 2),
            },
          ],
        };
      }

      // Handle pattern resources
      if (uri === 'patterns://rest-api-design') {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: API_DESIGN_PATTERNS_CONTENT,
            },
          ],
        };
      }

      if (uri === 'patterns://error-handling') {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: ERROR_HANDLING_GUIDE_CONTENT,
            },
          ],
        };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    });
  }
}
