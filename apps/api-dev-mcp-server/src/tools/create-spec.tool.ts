import { z } from 'zod';
import { SpecsStore } from '../resources/specs-store.js';
import { generateOpenAPISpec } from '../generators/openapi-generator.js';

const CreateSpecInputSchema = z.object({
  title: z.string().min(1).describe('API title'),
  description: z.string().optional().describe('API description'),
  version: z.string().optional().describe('API version (e.g., 1.0.0)'),
  resources: z.array(z.string()).min(1).describe('Array of resource names (e.g., ["posts", "comments"])'),
});

type CreateSpecInput = z.infer<typeof CreateSpecInputSchema>;

export class CreateSpecTool {
  name = 'create_openapi_spec';
  description =
    'Create a new OpenAPI 3.1 specification from a high-level description. Generates RESTful CRUD endpoints for each resource with proper schemas, validation, and error handling.';
  inputSchema = {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'API title (e.g., "Blog API", "E-commerce API")',
      },
      description: {
        type: 'string',
        description: 'Optional API description',
      },
      version: {
        type: 'string',
        description: 'API version (e.g., "1.0.0")',
      },
      resources: {
        type: 'array',
        description: 'Array of resource names to generate CRUD endpoints for',
        items: { type: 'string' },
        minItems: 1,
        examples: [['posts', 'comments'], ['products', 'categories', 'orders']],
      },
    },
    required: ['title', 'resources'],
  };

  constructor(private specsStore: SpecsStore) {}

  async execute(args: unknown) {
    // Validate input
    const validated = CreateSpecInputSchema.parse(args);

    // Generate OpenAPI spec
    const spec = generateOpenAPISpec(validated);

    // Store spec with unique ID
    const specId = this.generateId();
    this.specsStore.set(specId, spec);

    // Return success response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              specId,
              message: `Created OpenAPI specification: "${validated.title}"`,
              summary: {
                title: spec.info.title,
                version: spec.info.version,
                resources: validated.resources,
                endpoints: Object.keys(spec.paths).length,
                resourceUri: `openapi://spec/${specId}`,
              },
              nextSteps: [
                `View the spec: Read resource "openapi://spec/${specId}"`,
                `Validate it: Call tool "validate_openapi_spec" with specId="${specId}"`,
                `Add more endpoints: Call tool "add_endpoint" with specId="${specId}"`,
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private generateId(): string {
    return `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
