import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FinikClientService } from './finik-client.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FinikClientService],
})
export class PaymentsModule {}
