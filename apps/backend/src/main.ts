import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug'] });

  // CORS — izinkan frontend dev & production
  app.enableCors({
    origin: [
      'http://localhost:4200',
      process.env.CORS_ORIGIN ?? '',
    ].filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IDX Stock Screener API')
    .setDescription('Backend API untuk swing trading screener BEI')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  if (process.env.VERCEL) {
    await app.init();
    return app.getHttpAdapter().getInstance();
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Server berjalan di http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

// Untuk deployment normal/local
if (!process.env.VERCEL) {
  bootstrap();
}

// Untuk Vercel Serverless
let cachedHandler: any;
export default async (req: any, res: any) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(req, res);
};
