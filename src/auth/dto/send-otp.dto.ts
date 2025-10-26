import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+996\d{9}$/, {
    message: 'Phone number must be in format +996XXXXXXXXX',
  })
  phone_number: string;
}
