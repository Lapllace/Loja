import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
  ensureUploadsDir,
} from './modules/uploads/storage.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // Imagens enviadas ficam acessíveis publicamente em /uploads/<arquivo>,
  // ANTES do prefixo global para que a URL pública não seja /api/uploads.
  ensureUploadsDir();
  app.useStaticAssets(UPLOADS_DIR, { prefix: `${UPLOADS_URL_PREFIX}/` });

  app.setGlobalPrefix('api');

  // CORS: allow CORS_ORIGIN (comma-separated) + always allow localhost variants.
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const corsOrigins: (string | RegExp)[] = [
    // Always allow localhost for development
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  ];
  if (corsOriginEnv) {
    corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => {
      corsOrigins.push(o);
    });
  }
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: false,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  // '0.0.0.0' expõe a API para a rede local (ex.: testar pelo celular/tablet).
  // Sem host explícito Nest escuta só em localhost e dispositivos externos
  // recebem ERR_CONNECTION_REFUSED.
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
