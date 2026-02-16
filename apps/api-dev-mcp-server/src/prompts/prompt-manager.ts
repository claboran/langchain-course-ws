import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export class PromptManager {
  register(server: Server) {
    // List all available prompts
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'api_design_consultation',
            description: 'Help design a new API following REST best practices with few-shot examples',
            arguments: [
              {
                name: 'domain',
                description: 'Domain or business area (e.g., "e-commerce", "blog", "social-media")',
                required: true,
              },
              {
                name: 'resources',
                description: 'Comma-separated list of main resources (optional)',
                required: false,
              },
            ],
          },
          {
            name: 'endpoint_design',
            description: 'Design a specific API endpoint with proper request/response structure',
            arguments: [
              {
                name: 'operation',
                description: 'What the endpoint should do (e.g., "create a blog post", "search products")',
                required: true,
              },
              {
                name: 'resource',
                description: 'The resource being operated on (e.g., "posts", "products")',
                required: true,
              },
            ],
          },
          {
            name: 'error_handling_guide',
            description: 'Provide comprehensive error handling patterns and RFC 7807 guidance',
            arguments: [],
          },
        ],
      };
    });

    // Get a specific prompt with few-shot examples
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'api_design_consultation':
          return this.getApiDesignConsultation(args);

        case 'endpoint_design':
          return this.getEndpointDesign(args);

        case 'error_handling_guide':
          return this.getErrorHandlingGuide();

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  private getApiDesignConsultation(args?: Record<string, string>) {
    const domain = args?.domain || 'a new system';
    const resources = args?.resources;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I need to design a REST API for ${domain}${resources ? ` with resources: ${resources}` : ''}.`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `I'll help you design a REST API for ${domain}. Let me guide you through the process with best practices and examples.

**Step 1: Resource Identification**
Let's identify the main resources (nouns) in your domain. ${resources ? `You mentioned: ${resources}` : 'We need to identify these based on your domain entities.'}

**Step 2: API Design Patterns**
I recommend following these REST patterns:

1. **Resource-Oriented URLs**:
   - Collection: \`GET /api/v1/resources\`
   - Single: \`GET /api/v1/resources/{id}\`
   - Create: \`POST /api/v1/resources\`
   - Update: \`PUT /api/v1/resources/{id}\` or \`PATCH /api/v1/resources/{id}\`
   - Delete: \`DELETE /api/v1/resources/{id}\`

2. **Versioning**: Use URL versioning (\`/api/v1/...\`) for better client compatibility

3. **Filtering & Pagination**:
   \`\`\`
   GET /api/v1/products?status=active&page=1&limit=20&sort=-createdAt
   \`\`\`

4. **Nested Resources**: Use hierarchy for relationships
   \`\`\`
   GET /api/v1/posts/{postId}/comments
   POST /api/v1/posts/{postId}/comments
   \`\`\`

**Few-Shot Examples:**

**Example 1 - E-commerce API**:
\`\`\`yaml
# Product Management
GET    /api/v1/products              # List products with pagination
GET    /api/v1/products/{id}         # Get product details
POST   /api/v1/products              # Create product (admin)
PUT    /api/v1/products/{id}         # Update product (admin)
DELETE /api/v1/products/{id}         # Delete product (admin)
GET    /api/v1/products/{id}/reviews # Get product reviews
POST   /api/v1/products/{id}/reviews # Add review

# Category Management
GET    /api/v1/categories            # List categories
GET    /api/v1/categories/{id}/products # Products in category
\`\`\`

**Example 2 - Blog API**:
\`\`\`yaml
# Post Management
GET    /api/v1/posts                 # List posts (public)
GET    /api/v1/posts/{id}            # Get post details
POST   /api/v1/posts                 # Create post (authenticated)
PUT    /api/v1/posts/{id}            # Update post (author only)
DELETE /api/v1/posts/{id}            # Delete post (author only)

# Comments
GET    /api/v1/posts/{id}/comments   # Get comments
POST   /api/v1/posts/{id}/comments   # Add comment
PUT    /api/v1/comments/{id}         # Update comment
DELETE /api/v1/comments/{id}         # Delete comment

# Authors
GET    /api/v1/authors/{id}          # Get author profile
GET    /api/v1/authors/{id}/posts    # Get author's posts
\`\`\`

**Example 3 - Task Management API**:
\`\`\`yaml
# Projects
GET    /api/v1/projects              # List user's projects
POST   /api/v1/projects              # Create project
GET    /api/v1/projects/{id}         # Get project details
PUT    /api/v1/projects/{id}         # Update project
DELETE /api/v1/projects/{id}         # Delete project

# Tasks (nested under projects)
GET    /api/v1/projects/{id}/tasks   # List project tasks
POST   /api/v1/projects/{id}/tasks   # Create task in project
GET    /api/v1/tasks/{id}            # Get task details
PATCH  /api/v1/tasks/{id}            # Update task (partial)
DELETE /api/v1/tasks/{id}            # Delete task

# Task assignments
POST   /api/v1/tasks/{id}/assign     # Assign task to user
DELETE /api/v1/tasks/{id}/assign     # Unassign task
\`\`\`

**Next Steps:**
Would you like me to:
1. Create an OpenAPI specification for your ${domain} API?
2. Design specific endpoints in detail?
3. Add authentication/authorization patterns?

Just let me know what resources you want to include and I'll generate the spec!`,
          },
        },
      ],
    };
  }

  private getEndpointDesign(args?: Record<string, string>) {
    const operation = args?.operation || 'perform an operation';
    const resource = args?.resource || 'resources';

    // Infer HTTP method from operation
    const method = this.inferHttpMethod(operation);

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Design an endpoint to ${operation} for ${resource}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Let me design a proper endpoint for "${operation}" on ${resource}:

**Recommended Design:**

\`\`\`yaml
path: /api/v1/${resource.toLowerCase()}${method !== 'GET' && method !== 'POST' ? '/{id}' : ''}
method: ${method}
${
  method === 'POST' || method === 'PUT' || method === 'PATCH'
    ? `requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          # Define properties based on your ${resource} model
        required: []`
    : ''
}
responses:
  '${method === 'POST' ? '201' : '200'}':
    description: ${method === 'POST' ? 'Created' : 'Success'}
    content:
      application/json:
        schema:
          type: object
  '400':
    description: Bad Request - Validation failed
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
  '404':
    description: Resource not found
${
  method === 'POST' || method === 'PUT' || method === 'PATCH'
    ? `  '422':
    description: Unprocessable Entity`
    : ''
}
\`\`\`

**Request Example:**
${
  method === 'POST' || method === 'PUT' || method === 'PATCH'
    ? `\`\`\`json
{
  "name": "Example ${resource}",
  // ... other properties
}
\`\`\``
    : `\`\`\`bash
curl -X ${method} "https://api.example.com/api/v1/${resource.toLowerCase()}"
\`\`\``
}

**Response Example (Success):**
\`\`\`json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Example ${resource}",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
\`\`\`

**Best Practices Applied:**
✅ RESTful URL structure
✅ Appropriate HTTP method (${method})
✅ Proper status codes
✅ Request/response validation
✅ Comprehensive error handling
✅ ISO 8601 timestamps
✅ UUID identifiers

Would you like me to add this endpoint to your OpenAPI spec?`,
          },
        },
      ],
    };
  }

  private getErrorHandlingGuide() {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'What are the best practices for API error handling?',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `# API Error Handling Best Practices

## RFC 7807 Problem Details
Use the standardized Problem Details format for consistent error responses:

\`\`\`json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request body contains invalid data",
  "instance": "/api/v1/products/123",
  "errors": {
    "name": ["Name is required", "Name must be at least 3 characters"],
    "price": ["Price must be a positive number"]
  }
}
\`\`\`

## Common Error Patterns

### 1. Validation Error (400)
\`\`\`json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields failed validation",
  "errors": {
    "email": ["Must be a valid email address"],
    "age": ["Must be at least 18"]
  }
}
\`\`\`

### 2. Unauthorized (401)
\`\`\`json
{
  "type": "https://api.example.com/problems/unauthorized",
  "title": "Authentication Required",
  "status": 401,
  "detail": "Valid authentication credentials are required to access this resource"
}
\`\`\`

### 3. Forbidden (403)
\`\`\`json
{
  "type": "https://api.example.com/problems/forbidden",
  "title": "Access Denied",
  "status": 403,
  "detail": "You do not have permission to perform this action"
}
\`\`\`

### 4. Not Found (404)
\`\`\`json
{
  "type": "https://api.example.com/problems/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Product with ID '123' does not exist",
  "instance": "/api/v1/products/123"
}
\`\`\`

### 5. Conflict (409)
\`\`\`json
{
  "type": "https://api.example.com/problems/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "A product with this SKU already exists",
  "conflictingResource": {
    "id": "456",
    "sku": "PROD-001"
  }
}
\`\`\`

### 6. Rate Limited (429)
\`\`\`json
{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit of 100 requests per minute exceeded",
  "retryAfter": 42
}
\`\`\`

### 7. Internal Server Error (500)
\`\`\`json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again later.",
  "traceId": "abc123xyz"
}
\`\`\`

## HTTP Status Code Guidelines

**2xx - Success**
- 200 OK: Standard success response
- 201 Created: Resource successfully created
- 204 No Content: Success but no response body

**4xx - Client Errors**
- 400 Bad Request: Invalid syntax or validation failure
- 401 Unauthorized: Authentication required
- 403 Forbidden: Authenticated but not authorized
- 404 Not Found: Resource doesn't exist
- 409 Conflict: Resource state conflict
- 422 Unprocessable Entity: Semantic validation failure
- 429 Too Many Requests: Rate limit exceeded

**5xx - Server Errors**
- 500 Internal Server Error: Unexpected server error
- 502 Bad Gateway: Invalid upstream response
- 503 Service Unavailable: Temporarily unavailable
- 504 Gateway Timeout: Upstream timeout

## OpenAPI Error Schema

\`\`\`yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required:
        - type
        - title
        - status
      properties:
        type:
          type: string
          format: uri
          description: URI reference identifying the problem type
        title:
          type: string
          description: Short, human-readable summary
        status:
          type: integer
          description: HTTP status code
        detail:
          type: string
          description: Human-readable explanation
        instance:
          type: string
          format: uri
          description: URI reference identifying the specific occurrence
        errors:
          type: object
          additionalProperties:
            type: array
            items:
              type: string
          description: Validation errors by field
\`\`\`

## Best Practices

1. **Be Consistent**: Use the same error format across all endpoints
2. **Be Specific**: Provide clear, actionable error messages
3. **Be Secure**: Don't leak sensitive information in errors
4. **Be Helpful**: Include error codes and documentation links
5. **Log Everything**: Log errors server-side with trace IDs
6. **Version Your Errors**: Keep error formats stable across API versions

This ensures your API provides excellent developer experience and makes debugging much easier!`,
          },
        },
      ],
    };
  }

  private inferHttpMethod(operation: string): string {
    const op = operation.toLowerCase();
    if (op.includes('create') || op.includes('add')) return 'POST';
    if (op.includes('update') || op.includes('edit') || op.includes('modify')) return 'PUT';
    if (op.includes('delete') || op.includes('remove')) return 'DELETE';
    if (op.includes('get') || op.includes('fetch') || op.includes('list') || op.includes('retrieve'))
      return 'GET';
    return 'POST'; // default
  }
}
