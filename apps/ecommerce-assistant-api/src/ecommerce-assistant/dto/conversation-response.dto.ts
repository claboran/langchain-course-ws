import { ApiProperty } from '@nestjs/swagger';
import { ProductDocument } from '../ecommerce-assistant.model';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Assistant summary response',
    example: 'I found 3 mystery books for you...'
  })
  summary!: string;

  @ApiProperty({
    description: 'Retrieved product documents',
    type: 'array',
    items: { type: 'object' },
    example: [{
      content: 'The Murder of Roger Ackroyd by Agatha Christie...',
      metadata: { id: 'abc-123', category: 'books' }
    }]
  })
  products!: ProductDocument[];

  @ApiProperty({
    description: 'Whether products are included',
    example: true
  })
  hasProducts!: boolean;

  @ApiProperty({
    description: 'Whether the summary contains Markdown formatting',
    example: true
  })
  hasMarkdown!: boolean;

  @ApiProperty({
    description: 'Conversation ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  conversationId!: string;

  static from(data: {
    summary: string;
    products: ProductDocument[];
    hasProducts: boolean;
    hasMarkdown: boolean;
    conversationId: string;
  }): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.summary = data.summary;
    dto.products = data.products;
    dto.hasProducts = data.hasProducts;
    dto.hasMarkdown = data.hasMarkdown;
    dto.conversationId = data.conversationId;
    return dto;
  }
}
