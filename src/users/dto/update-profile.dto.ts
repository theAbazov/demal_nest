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
}
