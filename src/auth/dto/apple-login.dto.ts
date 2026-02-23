import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class AppleLoginDto {
  @ApiProperty({ description: 'Apple Sign-In provider token (Supabase session token)', example: 'eyJhbGciOiJIUzI1NiIsInR...' })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({ description: 'User identifier from Apple provider via Supabase', example: '000123.456789...' })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Full Name (optional, since Apple only shares it once)', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ description: 'Email address securely provided by Apple', example: 'john.doe@privaterelay.appleid.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone Number', required: false, example: '+1234567890' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
