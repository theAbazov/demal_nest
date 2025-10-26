import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService, FileType } from './upload.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить файл (изображение или документ)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Файл для загрузки',
        },
        type: {
          type: 'string',
          enum: ['image', 'document'],
          description: 'Тип файла',
        },
      },
    },
  })
  @ApiQuery({
    name: 'type',
    enum: ['image', 'document'],
    description: 'Тип загружаемого файла',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Файл успешно загружен',
    schema: {
      example: {
        success: true,
        data: {
          url: 'https://storage.googleapis.com/...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный формат файла' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!type || !['image', 'document'].includes(type)) {
      throw new Error('Type must be either "image" or "document"');
    }

    const fileType = type as FileType;
    const result = await this.uploadService.uploadFile(file, fileType);

    return {
      success: true,
      data: result,
    };
  }
}
