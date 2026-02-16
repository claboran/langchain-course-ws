export const API_DESIGN_PATTERNS_CONTENT = `# REST API Design Patterns

## 1. Resource Naming Conventions

### Use Plural Nouns
- ✅ \`/api/v1/products\`
- ✅ \`/api/v1/users\`
- ❌ \`/api/v1/product\`
- ❌ \`/api/v1/user\`

### Use Hierarchical Structure
- ✅ \`/api/v1/posts/{postId}/comments\`
- ✅ \`/api/v1/users/{userId}/orders\`
- ❌ \`/api/v1/comments?postId=123\` (for nested resources)

### Use Kebab-Case for Multi-word Resources
- ✅ \`/api/v1/product-categories\`
- ✅ \`/api/v1/user-profiles\`
- ❌ \`/api/v1/productCategories\` (camelCase)
- ❌ \`/api/v1/product_categories\` (snake_case)

## 2. HTTP Methods (CRUD Operations)

| Method | Purpose | Idempotent | Safe | Example |
|--------|---------|------------|------|---------|
| GET | Retrieve resource(s) | ✅ | ✅ | \`GET /api/v1/products\` |
| POST | Create new resource | ❌ | ❌ | \`POST /api/v1/products\` |
| PUT | Replace entire resource | ✅ | ❌ | \`PUT /api/v1/products/123\` |
| PATCH | Partial update | ⚠️ | ❌ | \`PATCH /api/v1/products/123\` |
| DELETE | Remove resource | ✅ | ❌ | \`DELETE /api/v1/products/123\` |

## 3. Standard CRUD Endpoints

\`\`\`yaml
# Collection Operations
GET    /api/v1/products              # List all products
POST   /api/v1/products              # Create new product

# Single Resource Operations
GET    /api/v1/products/{id}         # Get specific product
PUT    /api/v1/products/{id}         # Replace product
PATCH  /api/v1/products/{id}         # Update product partially
DELETE /api/v1/products/{id}         # Delete product

# Nested Resources
GET    /api/v1/products/{id}/reviews  # List product reviews
POST   /api/v1/products/{id}/reviews  # Add review to product
\`\`\`

## 4. Query Parameters

### Pagination
\`\`\`
GET /api/v1/products?page=2&limit=20

Response:
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "first": "/api/v1/products?page=1&limit=20",
    "prev": "/api/v1/products?page=1&limit=20",
    "next": "/api/v1/products?page=3&limit=20",
    "last": "/api/v1/products?page=8&limit=20"
  }
}
\`\`\`

### Filtering
\`\`\`
GET /api/v1/products?category=electronics&inStock=true&minPrice=100
\`\`\`

### Sorting
\`\`\`
GET /api/v1/products?sort=price           # Ascending
GET /api/v1/products?sort=-price          # Descending
GET /api/v1/products?sort=category,price  # Multiple fields
\`\`\`

### Field Selection (Sparse Fieldsets)
\`\`\`
GET /api/v1/products?fields=id,name,price
\`\`\`

### Search
\`\`\`
GET /api/v1/products?q=laptop&category=electronics
\`\`\`

## 5. Versioning Strategies

### URL Versioning (Recommended)
\`\`\`
GET /api/v1/products
GET /api/v2/products
\`\`\`

### Header Versioning
\`\`\`
GET /api/products
Header: Accept: application/vnd.myapi.v1+json
\`\`\`

## 6. Response Formats

### Single Resource
\`\`\`json
{
  "id": "123",
  "name": "Product Name",
  "price": 29.99,
  "createdAt": "2024-01-15T10:30:00Z"
}
\`\`\`

### Collection with Metadata
\`\`\`json
{
  "data": [
    { "id": "123", "name": "Product 1" },
    { "id": "124", "name": "Product 2" }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
\`\`\`

## 7. Status Codes

### Success Codes
- **200 OK**: Successful GET, PUT, PATCH, DELETE
- **201 Created**: Successful POST with resource creation
- **204 No Content**: Successful DELETE with no response body

### Client Error Codes
- **400 Bad Request**: Malformed request or validation failure
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource state conflict
- **422 Unprocessable Entity**: Semantic validation errors
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **502 Bad Gateway**: Invalid upstream response
- **503 Service Unavailable**: Service temporarily down

## 8. Authentication & Authorization

### Bearer Token
\`\`\`
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### API Key
\`\`\`
X-API-Key: your-api-key-here
\`\`\`

## 9. Rate Limiting Headers

\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640000000
\`\`\`

## 10. HATEOAS (Hypermedia)

\`\`\`json
{
  "id": "123",
  "name": "Product",
  "_links": {
    "self": { "href": "/api/v1/products/123" },
    "reviews": { "href": "/api/v1/products/123/reviews" },
    "category": { "href": "/api/v1/categories/electronics" }
  }
}
\`\`\`

## 11. Common Patterns

### Bulk Operations
\`\`\`yaml
POST /api/v1/products/bulk-create
DELETE /api/v1/products/bulk-delete
\`\`\`

### Actions (Non-CRUD)
\`\`\`yaml
POST /api/v1/orders/{id}/cancel
POST /api/v1/products/{id}/publish
POST /api/v1/users/{id}/verify-email
\`\`\`

### Async Operations
\`\`\`yaml
POST /api/v1/reports/generate
Response: 202 Accepted
{
  "jobId": "abc123",
  "status": "pending",
  "_links": {
    "status": "/api/v1/jobs/abc123"
  }
}
\`\`\`
`;
