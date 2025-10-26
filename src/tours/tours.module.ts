import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ToursController],
  providers: [ToursService, PrismaService],
  exports: [ToursService],
})
export class ToursModule {}
