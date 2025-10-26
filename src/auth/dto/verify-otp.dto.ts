import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+996\d{9}$/, {
    message: 'Phone number must be in format +996XXXXXXXXX',
  })
  phone_number: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'OTP code must be 4 digits' })
  otp_code: string;
}
