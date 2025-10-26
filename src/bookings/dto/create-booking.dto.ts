import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsEmail,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID тура',
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  tour_id: string;

  @ApiProperty({
    description: 'Количество мест',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  seats_count: number;

  @ApiProperty({
    description: 'Имя бронирующего',
    example: 'Иван Петров',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Email бронирующего',
    example: 'ivan@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
