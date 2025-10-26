import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Временно отключаем автоподключение для отладки
    try {
      await this.$connect();
      console.log('✅ Connected to PostgreSQL');
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      // Не бросаем ошибку, чтобы приложение могло запуститься
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
