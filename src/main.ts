import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс API (должен быть установлен ПЕРЕД Swagger)
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Demal API')
    .setDescription('API для платформы Demal - туры и бронирования')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Глобальная валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Глобальный фильтр ошибок
  app.useGlobalFilters(new HttpExceptionFilter());

  // Глобальный интерсептор
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
}
bootstrap();
