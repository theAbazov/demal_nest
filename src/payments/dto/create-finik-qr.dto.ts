import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFinikQrDto {
  @ApiProperty({ description: 'ID бронирования', format: 'uuid' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ description: 'Название QR для клиента', example: 'Demal booking payment' })
  @IsString()
  @MaxLength(255)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Фиксированная сумма оплаты', example: 1500.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  fixedAmount?: number;
}
