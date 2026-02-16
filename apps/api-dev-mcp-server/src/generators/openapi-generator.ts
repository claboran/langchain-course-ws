/**
 * Generate OpenAPI 3.1 specifications from high-level descriptions
 */

interface GenerateSpecInput {
  title: string;
  description?: string;
  version?: string;
  resources: string[];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str
    .split('-')
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join('');
}

export function generateOpenAPISpec(input: GenerateSpecInput): any {
  const spec: any = {
    openapi: '3.1.0',
    info: {
      title: input.title,
      description: input.description || `API for ${input.title}`,
      version: input.version || '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    paths: {},
    components: {
      schemas: {},
      responses: {
        ErrorResponse: {
          description: 'Error response following RFC 7807',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                type: 'https://api.example.com/problems/not-found',
                title: 'Resource Not Found',
                status: 404,
                detail: 'The requested resource does not exist',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  // Add Error schema
  spec.components.schemas.Error = {
    type: 'object',
    required: ['type', 'title', 'status'],
    properties: {
      type: {
        type: 'string',
        format: 'uri',
        description: 'URI identifying the problem type',
      },
      title: {
        type: 'string',
        description: 'Short, human-readable summary',
      },
      status: {
        type: 'integer',
        description: 'HTTP status code',
      },
      detail: {
        type: 'string',
        description: 'Human-readable explanation',
      },
      instance: {
        type: 'string',
        format: 'uri',
        description: 'URI of the specific occurrence',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
      },
      errors: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  };

  // Generate schemas and endpoints for each resource
  for (const resource of input.resources) {
    const resourceName = resource.toLowerCase().replace(/\s+/g, '-');
    const ResourceName = capitalize(toCamelCase(resourceName));
    const resourceNamePlural = resourceName.endsWith('s') ? resourceName : `${resourceName}s`;

    // Define resource schema
    spec.components.schemas[ResourceName] = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: `Unique identifier for the ${resourceName}`,
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          description: `Name of the ${resourceName}`,
          example: `Sample ${ResourceName}`,
        },
        description: {
          type: 'string',
          maxLength: 1000,
          description: 'Detailed description',
          example: `Description of the ${resourceName}`,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Creation timestamp',
          readOnly: true,
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Last update timestamp',
          readOnly: true,
        },
      },
    };

    // Create schema for creating (without id, createdAt, updatedAt)
    spec.components.schemas[`Create${ResourceName}`] = {
      type: 'object',
      required: ['name'],
      properties: {
        name: spec.components.schemas[ResourceName].properties.name,
        description: spec.components.schemas[ResourceName].properties.description,
      },
    };

    // Create schema for updating (all fields optional)
    spec.components.schemas[`Update${ResourceName}`] = {
      type: 'object',
      properties: {
        name: spec.components.schemas[ResourceName].properties.name,
        description: spec.components.schemas[ResourceName].properties.description,
      },
    };

    // List schema with pagination
    spec.components.schemas[`${ResourceName}List`] = {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'array',
          items: { $ref: `#/components/schemas/${ResourceName}` },
        },
        meta: {
          type: 'object',
          required: ['page', 'limit', 'total'],
          properties: {
            page: { type: 'integer', minimum: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
            total: { type: 'integer', minimum: 0, example: 150 },
            totalPages: { type: 'integer', minimum: 0, example: 8 },
          },
        },
        links: {
          type: 'object',
          properties: {
            first: { type: 'string', format: 'uri' },
            prev: { type: 'string', format: 'uri' },
            next: { type: 'string', format: 'uri' },
            last: { type: 'string', format: 'uri' },
          },
        },
      },
    };

    // Collection endpoint
    spec.paths[`/api/v1/${resourceNamePlural}`] = {
      get: {
        summary: `List ${resourceNamePlural}`,
        description: `Retrieve a paginated list of ${resourceNamePlural}`,
        operationId: `list${ResourceName}s`,
        tags: [ResourceName],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort by field (prefix with - for descending)',
            schema: { type: 'string', example: '-createdAt' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${ResourceName}List` },
              },
            },
          },
          '400': { $ref: '#/components/responses/ErrorResponse' },
        },
      },
      post: {
        summary: `Create ${resourceName}`,
        description: `Create a new ${resourceName}`,
        operationId: `create${ResourceName}`,
        tags: [ResourceName],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/Create${ResourceName}` },
            },
          },
        },
        responses: {
          '201': {
            description: 'Resource created successfully',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${ResourceName}` },
              },
            },
          },
          '400': { $ref: '#/components/responses/ErrorResponse' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
        security: [{ bearerAuth: [] }],
      },
    };

    // Single resource endpoints
    spec.paths[`/api/v1/${resourceNamePlural}/{id}`] = {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `${ResourceName} ID`,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        summary: `Get ${resourceName}`,
        description: `Retrieve a single ${resourceName} by ID`,
        operationId: `get${ResourceName}`,
        tags: [ResourceName],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${ResourceName}` },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        summary: `Update ${resourceName}`,
        description: `Update an existing ${resourceName}`,
        operationId: `update${ResourceName}`,
        tags: [ResourceName],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/Update${ResourceName}` },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resource updated successfully',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${ResourceName}` },
              },
            },
          },
          '400': { $ref: '#/components/responses/ErrorResponse' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        summary: `Delete ${resourceName}`,
        description: `Delete a ${resourceName}`,
        operationId: `delete${ResourceName}`,
        tags: [ResourceName],
        responses: {
          '204': {
            description: 'Resource deleted successfully',
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
        security: [{ bearerAuth: [] }],
      },
    };
  }

  return spec;
}

export function addEndpointToSpec(
  spec: any,
  path: string,
  method: string,
  summary: string,
  requestBody?: any,
  responses?: any
): void {
  if (!spec.paths[path]) {
    spec.paths[path] = {};
  }

  const endpoint: any = {
    summary,
    operationId: toCamelCase(summary.toLowerCase().replace(/\s+/g, '-')),
    responses: responses || {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    },
  };

  if (requestBody) {
    endpoint.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: requestBody,
        },
      },
    };
  }

  spec.paths[path][method.toLowerCase()] = endpoint;
}
