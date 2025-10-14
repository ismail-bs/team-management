import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ThrottleGuard } from './common/guards/throttle.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware with proper configuration
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow custom CSP configuration
      crossOriginEmbedderPolicy: false, // Allow embedding for development
    }),
  );

  // CORS configuration with proper error handling
  const frontendUrl = configService.get('app.frontendUrl');
  if (!frontendUrl) {
    console.warn(
      'WARNING: FRONTEND_URL not configured. CORS may not work correctly.',
    );
  }

  const allowedOrigins = [
    process.env.LOCALHOST_URL,
    process.env.DEFAULT_FRONTEND_URL,
    process.env.FRONTEND_URL, // optional from env
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  // Global validation pipe with enhanced security
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Reject requests with non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('app.nodeEnv') === 'production', // Hide detailed validation errors in production
    }),
  );

  // Global rate limiting
  app.useGlobalGuards(new ThrottleGuard(configService));

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Team Management API')
    .setDescription('API for team management platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('app.port');
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
