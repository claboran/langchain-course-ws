import { z } from 'zod';
import { SpecsStore } from '../resources/specs-store.js';

const GetSpecInputSchema = z.object({
  specId: z.string().describe('ID of the OpenAPI spec to retrieve'),
});

export class GetSpecTool {
  name = 'get_spec';
  description =
    'Retrieve the full content of an OpenAPI specification by its ID. Use "list_specs" first to find available spec IDs.';
  inputSchema = {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID of the spec to retrieve (from list_specs or create_openapi_spec)',
      },
    },
    required: ['specId'],
  };

  constructor(private specsStore: SpecsStore) {}

  async execute(args: unknown) {
    const { specId } = GetSpecInputSchema.parse(args);

    const spec = await this.specsStore.get(specId);
    if (!spec) {
      throw new Error(
        `OpenAPI spec with ID "${specId}" not found. Use "list_specs" to see available specs.`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              specId,
              title: spec.info?.title,
              version: spec.info?.version,
              endpoints: Object.keys(spec.paths ?? {}).length,
              spec,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
