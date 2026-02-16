import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InitPaymentDto {
  @ApiProperty({ description: 'Booking UUID', format: 'uuid' })
  @IsUUID()
  booking_id: string;
}
