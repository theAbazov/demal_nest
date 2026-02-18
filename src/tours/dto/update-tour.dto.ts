import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  MaxLength,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTourDto, MeetingPointDto } from './create-tour.dto';

export class UpdateTourDto implements Partial<CreateTourDto> {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  main_image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tour_type?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  available_spots?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  program?: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeetingPointDto)
  meeting_point?: MeetingPointDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whats_included?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whats_not_included?: string[];

  @IsOptional()
  @IsString()
  what_to_bring?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_gallery_urls?: string[];
}
