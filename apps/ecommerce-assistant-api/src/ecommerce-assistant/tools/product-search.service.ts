import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { VectorStoreService } from '../vector-store.service';
import { ProductSearchInputSchema, ProductSearchInput } from '../ecommerce-assistant.model';

@Injectable()
export class ProductSearchService {
  readonly #logger = new Logger(ProductSearchService.name);

  constructor(private readonly vectorStoreService: VectorStoreService) {}

  createProductSearchTool() {
    const self = this;

    return tool(
      async (input: ProductSearchInput): Promise<string> => {
        const { query, category } = input;

        self.#logger.log(`Product search: "${query}"${category ? ` [category: ${category}]` : ''}`);

        try {
          const vectorStore = await self.vectorStoreService.getVectorStore();

          // Create retriever with optional metadata filter
          const retrieverConfig: any = { k: 3 };
          if (category) {
            retrieverConfig.filter = { category };
          }

          const retriever = vectorStore.asRetriever(retrieverConfig);
          const results = await retriever.invoke(query);

          self.#logger.log(`Found ${results.length} products`);
          if (results.length > 0) {
            self.#logger.debug(`Result IDs: ${results.map(r => r.metadata.id).join(', ')}`);
          }

          // Serialize results to JSON string for Mistral compatibility
          const serializedResults = results.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
          }));

          return JSON.stringify(serializedResults);
        } catch (error) {
          self.#logger.error(`Product search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return JSON.stringify([]);
        }
      },
      {
        name: 'search_products',
        description: `Search for products in the e-commerce catalog using semantic search.

Use this tool to find products based on user queries. The search understands natural language.

Parameters:
- query: The search query (e.g., "wireless headphones", "mystery novels")
- category: Optional filter for specific category ("books", "household", "clothing & accessories")

Returns: Array of product documents with content and metadata.`,
        schema: ProductSearchInputSchema
      }
    );
  }
}
