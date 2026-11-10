import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.getOrThrow('PORT'));

  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/v1`);
}

void bootstrap();
