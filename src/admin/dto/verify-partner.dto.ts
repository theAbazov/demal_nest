import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VerificationAction {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class VerifyPartnerDto {
  @ApiProperty({
    description: 'Действие верификации',
    enum: VerificationAction,
    example: 'VERIFIED',
  })
  @IsEnum(VerificationAction)
  action: VerificationAction;

  @ApiProperty({
    description: 'Комментарий администратора',
    example: 'Все документы подтверждены',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
