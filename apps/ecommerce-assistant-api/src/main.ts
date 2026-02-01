import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('E-commerce Assistant API')
    .setDescription(
      'Conversational e-commerce assistant API built with LangChain. ' +
      'Features semantic product search and category browsing with multi-turn memory.'
    )
    .setVersion('1.0')
    .addTag('ecommerce-assistant', 'Shopping assistant endpoints')
    .addServer(`http://localhost:${process.env['PORT'] || 3312}`, 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'E-commerce Assistant API',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env['PORT'] || 3312;
  await app.listen(port);
  Logger.log(`Application running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
