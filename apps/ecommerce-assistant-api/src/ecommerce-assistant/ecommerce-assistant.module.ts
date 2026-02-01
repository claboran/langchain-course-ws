import { Module } from '@nestjs/common';
import { EcommerceAssistantController } from './ecommerce-assistant.controller';
import { EcommerceAssistantService } from './ecommerce-assistant.service';
import { AgentService } from './agent.service';
import { AssistantMemoryService } from './assistant-memory.service';
import { VectorStoreService } from './vector-store.service';
import { ProductSearchService } from './tools/product-search.service';
import { CategoryService } from './tools/category.service';

@Module({
  controllers: [EcommerceAssistantController],
  providers: [
    EcommerceAssistantService,
    AssistantMemoryService,
    AgentService,
    ProductSearchService,
    CategoryService,
    VectorStoreService,
  ],
})
export class EcommerceAssistantModule {}
