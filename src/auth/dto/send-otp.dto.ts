import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'Номер телефона в формате +996XXXXXXXXX',
    example: '+996555123456',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+996\d{9}$/, {
    message: 'Phone number must be in format +996XXXXXXXXX',
  })
  phone_number: string;
}
