import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartnerProfileDto {
  @ApiProperty({
    description: 'Название компании',
    example: 'Туристическая компания "Горные тропы"',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  company_name: string;

  @ApiProperty({
    description: 'Описание компании',
    example: 'Профессиональные туристические туры по Кыргызстану',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL документов',
    example: 'https://example.com/documents.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documents_url?: string;

  @ApiProperty({
    description: 'Номер карты для выплат',
    example: '1234567890123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  card_number?: string;
}
