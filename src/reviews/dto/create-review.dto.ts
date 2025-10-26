import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'ID тура',
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  tour_id: string;

  @ApiProperty({
    description: 'Рейтинг (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Текст отзыва',
    example: 'Отличный тур, очень понравилось!',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;
}
