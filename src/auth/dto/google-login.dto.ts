import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google OAuth access token', example: 'ya29.a0AfH6SM...' })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({ description: 'Google User ID', example: '10293848...' })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Full Name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Email', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Avatar URL', required: false, example: 'https://lh3.googleusercontent.com/...' })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiProperty({ description: 'Phone Number', required: false, example: '+1234567890' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
