import { z } from 'zod';
import { SpecsStore } from '../resources/specs-store.js';
import { validateOpenAPISpec } from '../validators/swagger-validator.js';

const ValidateSpecInputSchema = z.object({
  specId: z.string().describe('ID of the OpenAPI spec to validate'),
});

type ValidateSpecInput = z.infer<typeof ValidateSpecInputSchema>;

export class ValidateSpecTool {
  name = 'validate_openapi_spec';
  description =
    'Validate an OpenAPI specification for correctness and compliance with OpenAPI 3.1 standards. Checks for schema errors, invalid references, and structural issues.';
  inputSchema = {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID of the spec to validate (returned from create_openapi_spec)',
      },
    },
    required: ['specId'],
  };

  constructor(private specsStore: SpecsStore) {}

  async execute(args: unknown) {
    // Validate input
    const validated = ValidateSpecInputSchema.parse(args);

    // Get spec from store
    const spec = this.specsStore.get(validated.specId);
    if (!spec) {
      throw new Error(`OpenAPI spec with ID "${validated.specId}" not found`);
    }

    // Validate the spec
    const validation = await validateOpenAPISpec(spec);

    // Return validation results
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              specId: validated.specId,
              valid: validation.valid,
              title: spec.info?.title,
              version: spec.info?.version,
              errors: validation.errors,
              warnings: validation.warnings,
              summary: validation.valid
                ? '✅ OpenAPI specification is valid and compliant with OpenAPI 3.1'
                : `❌ Validation failed with ${validation.errors.length} error(s)`,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
