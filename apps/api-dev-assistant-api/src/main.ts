/**
 * gRPC Microservice for API Development Assistant
 * Provides streaming chat with LangChain agent and MCP tool integration
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create gRPC microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'chat',
      protoPath: join(__dirname, '../../../proto/chat.proto'),
      url: '0.0.0.0:50051',
      loader: {
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  await app.listen();
  logger.log('🚀 gRPC microservice is listening on 0.0.0.0:50051');
  logger.log('📦 Package: chat');
  logger.log('🔧 Service: ChatService');
}

bootstrap();
