/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS
  app.enableCors();

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription(
      'Multi-turn conversation API built with LangChain and LangGraph. ' +
      'This API maintains conversation history using LangGraph\'s MemorySaver, ' +
      'allowing for contextual multi-turn conversations. The assistant has access ' +
      'to user information tools for personalization.'
    )
    .setVersion('1.0')
    .addTag('chat', 'Chat endpoints for conversing with the AI assistant')
    .addServer(`http://localhost:${process.env['PORT'] || 3311}`, 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Chat API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    raw: ['json', 'yaml'],
    jsonDocumentUrl: '/api-json',
    yamlDocumentUrl: '/api-yaml',
  });

  const port = process.env['PORT'] || 3311;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
