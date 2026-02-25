import { SpecsStore } from '../resources/specs-store.js';

export class ListSpecsTool {
  name = 'list_specs';
  description =
    'List all OpenAPI specifications that have been created in this session. Returns a summary of each spec including its ID, title, version, and number of endpoints.';
  inputSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  constructor(private specsStore: SpecsStore) {}

  async execute(_args: unknown) {
    const specs = await this.specsStore.list();

    const summaries = specs.map(({ id, spec }) => ({
      specId: id,
      title: spec.info?.title ?? 'Untitled API',
      version: spec.info?.version ?? '1.0.0',
      description: spec.info?.description ?? '',
      endpoints: Object.keys(spec.paths ?? {}).length,
      resourceUri: `openapi://spec/${id}`,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: summaries.length,
              specs: summaries,
              message:
                summaries.length === 0
                  ? 'No specifications created yet. Use "create_openapi_spec" to get started.'
                  : `Found ${summaries.length} specification(s).`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
