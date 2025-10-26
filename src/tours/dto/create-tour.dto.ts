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

class MeetingPointDto {
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  coordinates?: string;
}

export class CreateTourDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  main_image_url: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  location: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  tour_type: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  time: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  available_spots: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  program?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingPointDto)
  meeting_point?: MeetingPointDto;

  @IsArray()
  @IsString({ each: true })
  whats_included: string[];

  @IsArray()
  @IsString({ each: true })
  whats_not_included: string[];

  @IsOptional()
  @IsString()
  what_to_bring?: string;

  @IsArray()
  @IsString({ each: true })
  image_gallery_urls: string[];
}
