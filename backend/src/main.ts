import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;

  // Security headers (disable CSP in dev to allow external image rendering safely)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Cookier parser for JWT httpOnly cookie reading
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3005', 'http://127.0.0.1:3005'],
    credentials: true,
  });

  // Body parser limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  await app.listen(port);
  console.log(`Intellexa NestJS Backend running on: http://localhost:${port}`);
}
bootstrap();
