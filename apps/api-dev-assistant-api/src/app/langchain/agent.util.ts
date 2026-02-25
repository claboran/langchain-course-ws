import { match } from 'ts-pattern';
import { ApiAssistantStateType } from './agent.state';

const REFINEMENT_RE = /\b(refine|update|change|modify|adjust|add endpoint|remove)\b/;
const API_DESIGN_RE = /\b(openapi|api|spec|endpoint|resource|crud|rest|swagger)\b/;

/**
 * Returns the message type string regardless of whether `m` is a live
 * LangChain class instance (has `_getType()`) or a plain object that was
 * deserialized from Redis (has only the `type` / `_type` field).
 */

// Describes a LangChain message class that exposes its type via _getType()
type GetTypeLike = { _getType: () => unknown };

const isGetTypeLike = (m: unknown): m is GetTypeLike => {
  if (typeof m !== 'object' || m === null) return false;
  const candidate = m as Record<string, unknown>;
  return typeof candidate['_getType'] === 'function';
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const msgType = (m: unknown): string => {
  // Live LangChain class instance — use the _getType() method
  if (isGetTypeLike(m)) {
    return asString(m._getType()) ?? '';
  }

  // Plain object (e.g. deserialized from Redis) — fall back to static fields
  if (typeof m === 'object' && m !== null) {
    const plain = m as Record<string, unknown>;
    return asString(plain['type']) ?? asString(plain['_type']) ?? '';
  }
  return '';
};

/** Simple keyword-based intent classifier */
export const classifyIntent = (
  message: string,
  ): ApiAssistantStateType['intent'] => {
  const lower = message.toLowerCase();

  return match(lower)
    .when((s) => REFINEMENT_RE.test(s), () => 'refinement' as const)
    .when((s) => API_DESIGN_RE.test(s), () => 'api_design' as const)
    .otherwise(() => 'general' as const);
};

/**
 * Builds the system prompt for the clarification phase.
 * The assistant acts as a requirements-gathering consultant — creative and exploratory.
 * Tools are available with auto choice (e.g. fetching API best practices from MCP).
 */
export const buildClarificationSystemPrompt = (tools: { name: string }[]): string => {
  const toolSection =
    tools.length > 0
      ? `\nYou have access to these tools: ${tools.map((t) => t.name).join(', ')}\nUse them when they help clarify requirements — for example, fetching API standards, best practices, or existing specs.`
      : '';

  return `You are an expert API design consultant in a discovery and requirements-gathering session.

Your goal is to build a thorough shared understanding of what the user wants before any implementation begins.

Explore these areas through natural conversation — not all at once:
- Purpose and domain of the API
- Resources and entities (what objects/nouns the API manages)
- Authentication and authorization model
- Validation rules and data constraints
- Error handling expectations and edge cases
- Expected consumers (web, mobile, third-party integrations, etc.)
- Scale or performance considerations if relevant

Guidelines:
- Ask targeted, thoughtful follow-up questions — one or two at a time
- Use markdown when it aids clarity (tables, lists, code samples)
- Use mermaid diagrams when visualising entity relationships or flows adds value — only when helpful, never forced
- Be creative and exploratory; help the user uncover aspects they may not have considered
- Do NOT start generating OpenAPI specs or implementation details yet — this phase is purely about building shared understanding
${toolSection}`.trim();
};

/**
 * Builds the system prompt for the API assistant agent.
 * When tools are available their names are listed and the model is instructed
 * to use them proactively.
 */
export const buildSystemPrompt = (tools: { name: string }[]): string => {
  const toolSection =
    tools.length > 0
      ? `You have access to these tools: ${tools.map((t) => t.name).join(', ')}

When the user asks to create or design an API, proactively use the available tools to generate a real OpenAPI specification. Always use create_openapi_spec when asked to design an API.`
      : '';

  return `You are an AI assistant specialized in API development and software engineering.

Your primary role is to help developers design and build APIs. You excel at:
- Generating OpenAPI 3.1 specifications from natural language descriptions
- Adding and refining API endpoints
- Validating and reviewing API designs
- Explaining REST best practices

${toolSection}
Guidelines:
- Be concise and action-oriented
- Use tools proactively when they can provide concrete results
- Explain what you are doing when calling tools
- Ask clarifying questions only when truly necessary`.trim();
};

/** Extract specId from a tool result message content */
export const extractSpecId = (content: string): string | null => {
  try {
    const parsed = JSON.parse(content);
    return parsed.specId ?? null;
  } catch {
    return null;
  }
};

/** Extract spec title from a tool result message content */
export const extractSpecTitle = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    return parsed.summary?.title ?? parsed.title ?? 'Generated API';
  } catch {
    return 'Generated API';
  }
};

/** Extract endpoint count from a tool result message content */
export const extractEndpointCount = (content: string): number => {
  try {
    const parsed = JSON.parse(content);
    return parsed.summary?.endpoints ?? parsed.totalEndpoints ?? 0;
  } catch {
    return 0;
  }
};
