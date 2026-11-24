// Load .env before any module reads process.env at import time
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import { PluginRegistryService } from './plugins/plugin-registry.service';

// The server's package.json sits next to dist/, both in the repo and in the Docker image
const APP_VERSION: string = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // Behind Caddy (same machine): trust its X-Forwarded-* for client IP and https
  app.set('trust proxy', 'loopback');

  if (process.env.NODE_ENV === 'production') {
    for (const name of ['JWT_SECRET', 'ENCRYPTION_KEY']) {
      if (!process.env[name]) {
        console.warn(`⚠️  ${name} is not set; using an insecure development default.`);
      }
    }
  }

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // The web client checks GitHub for new releases
          connectSrc: ["'self'", 'https://api.github.com'],
          // Images inside emails come from anywhere
          imgSrc: ["'self'", 'data:', 'https:'],
          // Keep plain-HTTP self-hosting (e.g. http://localhost:8080) working
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(compression());
  // Comma-separated list, e.g. the web origin plus the desktop/mobile app
  // origins; "*" allows any (sign-in uses bearer tokens, not cookies)
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
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
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      plugins: pluginRegistry.getPlugins().map((p) => p.id),
    });
  });

  // Serve the built web client when present (the Docker image puts it in ./public)
  const clientDir = process.env.CLIENT_DIR || join(process.cwd(), 'public');
  const clientIndex = join(clientDir, 'index.html');
  if (existsSync(clientIndex)) {
    app.useStaticAssets(clientDir, { index: false });
    // Any other page load gets the app; it handles its own routes
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path === '/health' || req.path.startsWith('/api')) return next();
      res.sendFile(clientIndex);
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔌 ${pluginRegistry.getPlugins().length} plugin(s) loaded`);
}

bootstrap();
