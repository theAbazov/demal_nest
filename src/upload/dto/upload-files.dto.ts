import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsObject } from 'class-validator';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export class UploadFileDto {
  @ApiProperty({
    description: 'Тип файла',
    enum: FileType,
  })
  @IsEnum(FileType)
  type: FileType;
}

export class UploadMultipleFilesDto {
  @ApiProperty({
    description: 'Тип файлов',
    enum: FileType,
  })
  @IsEnum(FileType)
  type: FileType;
}

export class UploadWithKeysDto {
  @ApiProperty({
    description: 'Тип файлов',
    enum: FileType,
  })
  @IsEnum(FileType)
  type: FileType;

  @ApiProperty({
    description: 'Дополнительные метаданные в виде JSON объекта (опционально)',
    example: { folder: 'tours', category: 'main' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
