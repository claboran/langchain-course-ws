import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { GetCategoriesInputSchema } from '../ecommerce-assistant.model';

@Injectable()
export class CategoryService {
  readonly #logger = new Logger(CategoryService.name);

  private readonly CATEGORIES = [
    "books",
    "household",
    "clothing & accessories"
  ];

  createCategoryTool() {
    const self = this;

    return tool(
      async (_input: Record<string, never>): Promise<string[]> => {
        self.#logger.debug('Category tool invoked');
        return self.CATEGORIES;
      },
      {
        name: 'get_categories',
        description: `Get the list of available product categories in the shop.

Use this tool when the user asks about what the shop offers or wants to browse categories.

No parameters required.

Returns: Array of category names.`,
        schema: GetCategoriesInputSchema
      }
    );
  }
}
