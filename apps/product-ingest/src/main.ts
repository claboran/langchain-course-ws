import 'reflect-metadata';
import { CommandFactory } from 'nest-commander';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await CommandFactory.createWithoutRunning(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Use Winston as the NestJS logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await CommandFactory.runApplication(app);
}

bootstrap();
