import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetFinikItemDto {
  @ApiProperty({ description: 'ID QR в Finik' })
  @IsString()
  id: string;
}
