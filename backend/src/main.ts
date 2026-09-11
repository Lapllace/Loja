import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/api/payments/webhooks/pagbank',
    express.raw({
      type: 'application/json',
      limit: '1mb',
      verify: (req, _res, buffer) => {
        (req as any).rawBody = buffer;
      },
    }),
  );

  app.use(
    '/api/deliveries/webhooks/ninenine',
    express.raw({
      type: 'application/json',
      limit: '1mb',
      verify: (req, _res, buffer) => {
        (req as any).rawBody = buffer;
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
