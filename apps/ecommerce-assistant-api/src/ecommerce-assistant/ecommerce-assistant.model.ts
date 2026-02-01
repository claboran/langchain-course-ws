import { z } from 'zod';

// Tool input schemas
export const ProductSearchInputSchema = z.object({
  query: z.string().describe("The search query to find relevant products"),
  category: z.string().optional().describe("Optional category filter: 'books', 'household', or 'clothing & accessories'")
});

export const GetCategoriesInputSchema = z.object({});

// Response schemas
export const ProductDocumentSchema = z.object({
  content: z.string().describe("Product description"),
  metadata: z.record(z.string(), z.any()).describe("Product metadata (id, category, etc.)")
});

export const EcommerceResultSchema = z.object({
  summary: z.string()
    .min(1)
    .max(5000)
    .describe("Helpful summary responding to user's query. You can use Markdown formatting for better presentation."),
  products: z.array(ProductDocumentSchema)
    .max(3)
    .describe("Up to 3 relevant product documents"),
  hasProducts: z.boolean()
    .describe("Whether products were successfully retrieved"),
  hasMarkdown: z.boolean()
    .describe("Whether the summary contains Markdown formatting, code blocks, or lists")
});

// Type exports
export type ProductSearchInput = z.infer<typeof ProductSearchInputSchema>;
export type EcommerceResult = z.infer<typeof EcommerceResultSchema>;
export type ProductDocument = z.infer<typeof ProductDocumentSchema>;
