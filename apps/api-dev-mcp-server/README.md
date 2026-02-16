# API Development MCP Server

A sophisticated Model Context Protocol (MCP) server for AI-assisted API development. Helps design, validate, and document RESTful APIs using OpenAPI 3.1 specifications with few-shot learning patterns.

## 🎯 Features

### **Resources**
- **OpenAPI Specifications**: Dynamic resources for each created spec
- **REST API Design Patterns**: Comprehensive best practices guide
- **Error Handling Guide**: RFC 7807 implementation patterns

### **Tools**
- **create_openapi_spec**: Generate complete OpenAPI 3.1 specs from high-level descriptions
- **validate_openapi_spec**: Validate specs for compliance and correctness
- **add_endpoint**: Add custom endpoints to existing specifications

### **Prompts** (Few-Shot Learning)
- **api_design_consultation**: Interactive API design with examples from e-commerce, blogs, task management
- **endpoint_design**: Detailed endpoint design with best practices
- **error_handling_guide**: Comprehensive error handling patterns

## 🚀 Quick Start

### Build the Server

\`\`\`bash
npx nx build api-dev-mcp-server
\`\`\`

### Run the Server

#### Stdio Mode (Local Development)
\`\`\`bash
node dist/apps/api-dev-mcp-server/main.js
\`\`\`

The server runs on **stdio transport** and communicates via JSON-RPC 2.0.

**⚠️ Stdio Limitation**: Only works in the same process/container. For Docker/Kubernetes deployments, use SSE mode.

#### SSE Mode (Production/Docker/Kubernetes)
\`\`\`bash
node dist/apps/api-dev-mcp-server/main-sse.js
\`\`\`

The server runs as an HTTP service on port 3100 (configurable via `MCP_PORT` env var).

**✅ SSE Benefits**: Network-based, works across containers, supports multiple clients, load balancing.

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker, Kubernetes, and production deployment guides.**

## 🧪 Testing

### Test with MCP Inspector

\`\`\`bash
npx nx test-mcp api-dev-mcp-server
\`\`\`

This opens the MCP Inspector UI where you can:
- Browse available resources
- Call tools interactively
- Test prompts with different parameters
- View JSON-RPC messages

### Test with CLI

#### List Tools
\`\`\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \\
  node dist/apps/api-dev-mcp-server/main.js 2>/dev/null
\`\`\`

#### Create an OpenAPI Spec
\`\`\`bash
cat << 'EOF' | node dist/apps/api-dev-mcp-server/main.js 2>/dev/null
{
  "jsonrpc":"2.0",
  "id":1,
  "method":"tools/call",
  "params":{
    "name":"create_openapi_spec",
    "arguments":{
      "title":"Blog API",
      "description":"RESTful API for blogging platform",
      "version":"1.0.0",
      "resources":["posts","comments","authors"]
    }
  }
}
EOF
\`\`\`

#### Get API Design Prompt
\`\`\`bash
cat << 'EOF' | node dist/apps/api-dev-mcp-server/main.js 2>/dev/null
{
  "jsonrpc":"2.0",
  "id":1,
  "method":"prompts/get",
  "params":{
    "name":"api_design_consultation",
    "arguments":{
      "domain":"e-commerce",
      "resources":"products,orders,customers"
    }
  }
}
EOF
\`\`\`

## 📋 Usage Examples

### Example 1: Design a Complete API

**Step 1: Get design consultation**
\`\`\`json
{
  "method": "prompts/get",
  "params": {
    "name": "api_design_consultation",
    "arguments": {
      "domain": "task-management",
      "resources": "projects,tasks,users"
    }
  }
}
\`\`\`

**Step 2: Create the OpenAPI spec**
\`\`\`json
{
  "method": "tools/call",
  "params": {
    "name": "create_openapi_spec",
    "arguments": {
      "title": "Task Management API",
      "version": "1.0.0",
      "resources": ["projects", "tasks", "users"]
    }
  }
}
\`\`\`

**Step 3: Add custom endpoint**
\`\`\`json
{
  "method": "tools/call",
  "params": {
    "name": "add_endpoint",
    "arguments": {
      "specId": "spec-1234567890-abc123",
      "path": "/api/v1/tasks/{id}/assign",
      "method": "post",
      "summary": "Assign task to user"
    }
  }
}
\`\`\`

**Step 4: Validate the spec**
\`\`\`json
{
  "method": "tools/call",
  "params": {
    "name": "validate_openapi_spec",
    "arguments": {
      "specId": "spec-1234567890-abc123"
    }
  }
}
\`\`\`

**Step 5: Read the final spec**
\`\`\`json
{
  "method": "resources/read",
  "params": {
    "uri": "openapi://spec/spec-1234567890-abc123"
  }
}
\`\`\`

### Example 2: Get Error Handling Guide

\`\`\`json
{
  "method": "prompts/get",
  "params": {
    "name": "error_handling_guide"
  }
}
\`\`\`

Returns comprehensive RFC 7807 patterns with examples for all HTTP status codes.

## 🏗️ Architecture

\`\`\`
api-dev-mcp-server/
├── src/
│   ├── main.ts                     # Server bootstrap
│   ├── resources/
│   │   ├── resource-manager.ts     # Resource handler registry
│   │   ├── specs-store.ts          # In-memory spec storage
│   ├── tools/
│   │   ├── tool-manager.ts         # Tool handler registry
│   │   ├── create-spec.tool.ts     # OpenAPI spec generator
│   │   ├── validate-spec.tool.ts   # Spec validator
│   │   └── add-endpoint.tool.ts    # Endpoint adder
│   ├── prompts/
│   │   └── prompt-manager.ts       # Few-shot prompt templates
│   ├── generators/
│   │   └── openapi-generator.ts    # OpenAPI 3.1 generation logic
│   ├── validators/
│   │   └── swagger-validator.ts    # OpenAPI validation
│   └── content/
│       ├── patterns.ts             # REST API patterns
│       └── error-handling.ts       # Error handling guide
\`\`\`

## 🔧 Integration with LangChain

This MCP server is designed to be used with LangChain agents. Example integration:

\`\`\`typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tool } from '@langchain/core/tools';

// Connect to MCP server
const mcpClient = new MCPClient({
  name: 'api-dev-assistant',
  version: '1.0.0',
}, { capabilities: {} });

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/apps/api-dev-mcp-server/main.js'],
});

await mcpClient.connect(transport);

// Convert MCP tools to LangChain tools
const mcpTools = await mcpClient.listTools();
const langchainTools = mcpTools.tools.map(mcpTool =>
  tool(
    async (input) => {
      const result = await mcpClient.callTool({
        name: mcpTool.name,
        arguments: input,
      });
      return result.content[0].text;
    },
    {
      name: mcpTool.name,
      description: mcpTool.description,
      schema: z.object(mcpTool.inputSchema.properties),
    }
  )
);

// Use with LangChain agent
const agent = createAgent({
  model: chatModel,
  tools: langchainTools,
});
\`\`\`

## 📚 Generated OpenAPI Features

When you create a spec with \`create_openapi_spec\`, you get:

✅ **Complete CRUD endpoints** for each resource
✅ **Pagination support** with links (first, prev, next, last)
✅ **Filtering, sorting, and field selection** query parameters
✅ **Proper HTTP status codes** (200, 201, 204, 400, 401, 404)
✅ **RFC 7807 error responses** with detailed schemas
✅ **UUID-based identifiers** with examples
✅ **ISO 8601 timestamps** (createdAt, updatedAt)
✅ **Request/response validation** with required fields
✅ **Bearer token authentication** scheme
✅ **Multiple server configurations** (dev, prod)
✅ **Operation IDs** for code generation
✅ **Resource tags** for organization

## 🎓 Few-Shot Learning

The prompts use few-shot learning to teach API design patterns:

### API Design Consultation
- **E-commerce example**: Products, reviews, categories
- **Blog example**: Posts, comments, authors
- **Task management example**: Projects, tasks, assignments

### Endpoint Design
- Automatically infers HTTP method from operation description
- Provides complete request/response examples
- Includes validation and error handling patterns

### Error Handling
- RFC 7807 Problem Details format
- Examples for all common HTTP status codes
- Field-level validation error patterns

## 🔍 MCP Protocol

This server implements the full MCP protocol:

- **Stdio Transport**: JSON-RPC 2.0 over stdin/stdout
- **Resources**: Dynamic and static content
- **Tools**: Executable functions with typed inputs
- **Prompts**: Few-shot templates with arguments

## 📝 Development

### Run in Development Mode

\`\`\`bash
npx nx dev api-dev-mcp-server
\`\`\`

This watches for file changes and auto-restarts the server.

### Project Structure

Built with:
- **TypeScript** - Type safety
- **Vite** - Fast builds
- **Nx** - Monorepo tooling
- **Zod** - Runtime validation
- **@modelcontextprotocol/sdk** - MCP protocol
- **@apidevtools/swagger-parser** - OpenAPI validation

## 🤝 Contributing

This MCP server is part of the langchain-course workspace and demonstrates:
- Complex MCP server architecture
- Few-shot learning patterns
- LangChain integration
- OpenAPI generation

## 📖 Related Documentation

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)
- [LangChain JS Documentation](https://js.langchain.com/)

---

Built with ❤️ for the LangChain Course Workspace
