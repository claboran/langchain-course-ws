import { z } from 'zod';
import { SpecsStore } from '../resources/specs-store.js';
import { addEndpointToSpec } from '../generators/openapi-generator.js';

const AddEndpointInputSchema = z.object({
  specId: z.string().describe('ID of the OpenAPI spec'),
  path: z.string().describe('Endpoint path (e.g., /api/v1/posts)'),
  method: z.enum(['get', 'post', 'put', 'patch', 'delete']).describe('HTTP method'),
  summary: z.string().describe('Brief description of what this endpoint does'),
  requestBody: z.any().optional().describe('Request body schema (for POST/PUT/PATCH)'),
  responses: z.any().optional().describe('Response schemas'),
});

type AddEndpointInput = z.infer<typeof AddEndpointInputSchema>;

export class AddEndpointTool {
  name = 'add_endpoint';
  description =
    'Add a new endpoint to an existing OpenAPI specification. Useful for customizing the API with additional routes beyond the auto-generated CRUD operations.';
  inputSchema = {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID of the spec to modify',
      },
      path: {
        type: 'string',
        description: 'Endpoint path (e.g., "/api/v1/posts/{id}/publish")',
      },
      method: {
        type: 'string',
        enum: ['get', 'post', 'put', 'patch', 'delete'],
        description: 'HTTP method',
      },
      summary: {
        type: 'string',
        description: 'Brief description of the endpoint',
      },
      requestBody: {
        type: 'object',
        description: 'Optional request body schema (for POST/PUT/PATCH)',
      },
      responses: {
        type: 'object',
        description: 'Optional response schemas',
      },
    },
    required: ['specId', 'path', 'method', 'summary'],
  };

  constructor(private specsStore: SpecsStore) {}

  async execute(args: unknown) {
    // Validate input
    const validated = AddEndpointInputSchema.parse(args);

    // Get spec from store
    const spec = await this.specsStore.get(validated.specId);
    if (!spec) {
      throw new Error(`OpenAPI spec with ID "${validated.specId}" not found`);
    }

    // Add endpoint to spec
    addEndpointToSpec(
      spec,
      validated.path,
      validated.method,
      validated.summary,
      validated.requestBody,
      validated.responses
    );

    // Update spec in store
    await this.specsStore.set(validated.specId, spec);

    // Return success response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              specId: validated.specId,
              message: `Added endpoint: ${validated.method.toUpperCase()} ${validated.path}`,
              endpoint: {
                path: validated.path,
                method: validated.method.toUpperCase(),
                summary: validated.summary,
              },
              totalEndpoints: Object.keys(spec.paths).length,
              nextSteps: [
                `View updated spec: Read resource "openapi://spec/${validated.specId}"`,
                `Validate changes: Call tool "validate_openapi_spec" with specId="${validated.specId}"`,
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
