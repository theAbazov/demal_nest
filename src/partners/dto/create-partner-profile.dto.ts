import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePartnerProfileDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  company_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documents_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  card_number?: string;
}
