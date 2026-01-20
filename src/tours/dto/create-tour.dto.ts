import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  MaxLength,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MeetingPointDto {
  @ApiProperty({ example: 'Бишкек, пр. Чуй, 145' })
  @IsString()
  address: string;

  @ApiProperty({ example: '42.8746,74.5698', required: false })
  @IsOptional()
  @IsString()
  coordinates?: string;
}

export class CreateTourDto {
  @ApiProperty({ example: 'Тур по озеру Иссык-Куль' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'https://example.com/main-image.jpg' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  main_image_url: string;

  @ApiProperty({ example: 'Озеро Иссык-Куль' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  location: string;

  @ApiProperty({ example: 'Активный отдых' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  tour_type: string;

  @ApiProperty({ example: '2024-06-15' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  time: string;

  @ApiProperty({ example: 5000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'KGS', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ example: 20 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  available_spots: number;

  @ApiProperty({
    example:
      'Прекрасный однодневный тур с посещением основных достопримечательностей',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: {
      '09:00': 'Встреча',
      '10:00': 'Выезд',
      '12:00': 'Прибытие',
    },
    required: false,
  })
  @IsOptional()
  program?: any;

  @ApiProperty({ type: MeetingPointDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingPointDto)
  meeting_point?: MeetingPointDto;

  @ApiProperty({
    example: ['Трансфер', 'Обед', 'Гид'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  whats_included: string[];

  @ApiProperty({
    example: ['Личные расходы', 'Алкоголь'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  whats_not_included: string[];

  @ApiProperty({
    example: 'Удобная одежда, солнцезащитный крем, вода',
    required: false,
  })
  @IsOptional()
  @IsString()
  what_to_bring?: string;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  image_gallery_urls: string[];
}
