// Load .env before any module reads process.env at import time
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { PluginRegistryService } from './plugins/plugin-registry.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  if (process.env.NODE_ENV === 'production') {
    for (const name of ['JWT_SECRET', 'ENCRYPTION_KEY']) {
      if (!process.env[name]) {
        console.warn(`⚠️  ${name} is not set; using an insecure development default.`);
      }
    }
  }

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    // Comma-separated list, e.g. the web origin plus the desktop/mobile app origins
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Initialize plugin system
  const pluginRegistry = app.get(PluginRegistryService);
  pluginRegistry.setApp(app);
  await pluginRegistry.initializeAll(app);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      version: '1.1.4',
      timestamp: new Date().toISOString(),
      plugins: pluginRegistry.getPlugins().map((p) => p.id),
    });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔌 ${pluginRegistry.getPlugins().length} plugin(s) loaded`);
}

bootstrap();
