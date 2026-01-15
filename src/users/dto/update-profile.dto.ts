import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Полное имя пользователя',
    example: 'Иван Петров',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @ApiProperty({
    description: 'URL аватара пользователя',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiProperty({
    description: 'Номер телефона пользователя',
    example: '+996555123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @ApiProperty({
    description: 'Описание (для партнеров)',
    example: 'Мы компания, организующая лучшие туры...',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
