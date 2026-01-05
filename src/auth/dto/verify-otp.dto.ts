import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  otp_code: string;
}
