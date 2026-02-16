export const ERROR_HANDLING_GUIDE_CONTENT = `# API Error Handling Best Practices

This guide covers comprehensive error handling strategies following RFC 7807 Problem Details specification.

## RFC 7807 Problem Details Format

The standard format for API errors:

\`\`\`json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid data",
  "instance": "/api/v1/products/123",
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "abc123xyz",
  "errors": {
    "name": ["Name is required"],
    "price": ["Price must be positive"]
  }
}
\`\`\`

## Error Response Fields

- **type** (required): URI identifying the problem type
- **title** (required): Short, human-readable summary
- **status** (required): HTTP status code
- **detail**: Detailed explanation of this specific error
- **instance**: URI of the specific request
- **timestamp**: ISO 8601 timestamp
- **traceId**: Unique identifier for tracking
- **errors**: Field-specific validation errors (optional)

## Standard Error Responses

### 400 Bad Request - Validation Error

\`\`\`json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Request Validation Failed",
  "status": 400,
  "detail": "The request body contains invalid or missing fields",
  "instance": "/api/v1/products",
  "timestamp": "2024-01-15T10:30:00Z",
  "errors": {
    "name": [
      "Name is required",
      "Name must be at least 3 characters"
    ],
    "price": [
      "Price must be a positive number",
      "Price cannot exceed 999999.99"
    ],
    "email": [
      "Must be a valid email address"
    ]
  }
}
\`\`\`

### 401 Unauthorized

\`\`\`json
{
  "type": "https://api.example.com/problems/unauthorized",
  "title": "Authentication Required",
  "status": 401,
  "detail": "Valid authentication credentials are required to access this resource",
  "instance": "/api/v1/products",
  "timestamp": "2024-01-15T10:30:00Z"
}
\`\`\`

### 403 Forbidden

\`\`\`json
{
  "type": "https://api.example.com/problems/forbidden",
  "title": "Access Denied",
  "status": 403,
  "detail": "You do not have permission to perform this action",
  "instance": "/api/v1/admin/users",
  "timestamp": "2024-01-15T10:30:00Z",
  "requiredRole": "admin"
}
\`\`\`

### 404 Not Found

\`\`\`json
{
  "type": "https://api.example.com/problems/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Product with ID '123' does not exist",
  "instance": "/api/v1/products/123",
  "timestamp": "2024-01-15T10:30:00Z",
  "resourceType": "Product",
  "resourceId": "123"
}
\`\`\`

### 409 Conflict

\`\`\`json
{
  "type": "https://api.example.com/problems/conflict",
  "title": "Resource Conflict",
  "status": 409,
  "detail": "A product with SKU 'PROD-001' already exists",
  "instance": "/api/v1/products",
  "timestamp": "2024-01-15T10:30:00Z",
  "conflictingField": "sku",
  "conflictingValue": "PROD-001",
  "existingResource": {
    "id": "456",
    "href": "/api/v1/products/456"
  }
}
\`\`\`

### 422 Unprocessable Entity

\`\`\`json
{
  "type": "https://api.example.com/problems/unprocessable",
  "title": "Business Rule Violation",
  "status": 422,
  "detail": "Cannot delete product with active orders",
  "instance": "/api/v1/products/123",
  "timestamp": "2024-01-15T10:30:00Z",
  "rule": "product_has_active_orders",
  "activeOrderCount": 5
}
\`\`\`

### 429 Too Many Requests

\`\`\`json
{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit of 100 requests per minute",
  "instance": "/api/v1/products",
  "timestamp": "2024-01-15T10:30:00Z",
  "retryAfter": 42,
  "limit": 100,
  "remaining": 0,
  "reset": "2024-01-15T10:31:00Z"
}
\`\`\`

### 500 Internal Server Error

\`\`\`json
{
  "type": "https://api.example.com/problems/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your request",
  "instance": "/api/v1/products",
  "timestamp": "2024-01-15T10:30:00Z",
  "traceId": "abc123xyz"
}
\`\`\`

### 503 Service Unavailable

\`\`\`json
{
  "type": "https://api.example.com/problems/service-unavailable",
  "title": "Service Temporarily Unavailable",
  "status": 503,
  "detail": "The service is undergoing scheduled maintenance",
  "timestamp": "2024-01-15T10:30:00Z",
  "retryAfter": 3600,
  "maintenanceEnd": "2024-01-15T12:00:00Z"
}
\`\`\`

## OpenAPI Schema Definition

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
          example: "https://api.example.com/problems/validation-error"
        title:
          type: string
          description: Short, human-readable summary
          example: "Validation Error"
        status:
          type: integer
          description: HTTP status code
          example: 400
        detail:
          type: string
          description: Human-readable explanation specific to this error
          example: "The request body contains invalid data"
        instance:
          type: string
          format: uri
          description: URI reference identifying the specific occurrence
          example: "/api/v1/products/123"
        timestamp:
          type: string
          format: date-time
          description: When the error occurred
          example: "2024-01-15T10:30:00Z"
        traceId:
          type: string
          description: Unique identifier for tracking this error
          example: "abc123xyz"
        errors:
          type: object
          description: Field-specific validation errors
          additionalProperties:
            type: array
            items:
              type: string
          example:
            name: ["Name is required"]
            price: ["Price must be positive"]
\`\`\`

## Error Handling Best Practices

### 1. Be Consistent
Use the same error format across all endpoints for predictable client handling.

### 2. Be Specific
Provide clear, actionable error messages that help developers fix issues quickly.

❌ Bad: "Invalid input"
✅ Good: "Email must be a valid email address (e.g., user@example.com)"

### 3. Be Secure
Never leak sensitive information in error messages.

❌ Bad: "SQL Error: SELECT * FROM users WHERE password = '...'"
✅ Good: "An internal error occurred. Trace ID: abc123"

### 4. Be Helpful
Include documentation links, error codes, and suggestions for fixing the issue.

\`\`\`json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "See documentation for request format",
  "documentation": "https://docs.example.com/api/products#create"
}
\`\`\`

### 5. Log Everything
Always log errors server-side with full context and stack traces.

### 6. Use Trace IDs
Include unique trace IDs to correlate client requests with server logs.

### 7. Respect HTTP Semantics
Use appropriate status codes that match the error type.

### 8. Handle Async Errors
For long-running operations, provide status endpoints:

\`\`\`json
{
  "jobId": "abc123",
  "status": "failed",
  "error": {
    "type": "https://api.example.com/problems/processing-error",
    "title": "Processing Failed",
    "detail": "Unable to generate report due to insufficient data"
  }
}
\`\`\`

## Rate Limiting Response Headers

Always include rate limit information in responses:

\`\`\`
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000000
Retry-After: 42

{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429
}
\`\`\`

## Implementation Checklist

✅ Use RFC 7807 Problem Details format
✅ Return appropriate HTTP status codes
✅ Include field-level validation errors
✅ Add trace IDs for debugging
✅ Log all errors server-side
✅ Never expose sensitive data
✅ Provide actionable error messages
✅ Include timestamp in ISO 8601 format
✅ Add retry-after headers for 429/503
✅ Link to documentation when helpful
`;
