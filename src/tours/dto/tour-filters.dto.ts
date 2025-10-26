import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum TourSortBy {
  DATE_ASC = 'date_asc',
  DATE_DESC = 'date_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING_DESC = 'rating_desc',
}

export class TourFiltersDto extends PaginationDto {
  @ApiProperty({ example: 'горы', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'Иссык-Куль', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'Активный отдых', required: false })
  @IsOptional()
  @IsString()
  tour_type?: string;

  @ApiProperty({ example: '2024-06-01', required: false })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiProperty({ example: '2024-06-30', required: false })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiProperty({ example: 1000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiProperty({ enum: TourSortBy, example: 'price_asc', required: false })
  @IsOptional()
  @IsEnum(TourSortBy)
  sort_by?: TourSortBy;
}
