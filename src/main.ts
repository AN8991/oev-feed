import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Set global prefix
  app.setGlobalPrefix('api/v1.0.0');

  // Error handling is now managed by ErrorHandlingInterceptor in middleware layer
  // No need for global exception filter - using comprehensive middleware approach

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('OEV Feed API')
    .setDescription('API for accessing Aave-Ethereum data and provider health')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1.0.0/docs', app, document);

  await app.listen(3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
