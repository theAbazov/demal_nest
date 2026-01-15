import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Query,
  BadRequestException,
  Delete,
  Body,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { FileType } from './dto/upload-files.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Загрузить один файл',
    description:
      'Загружает один файл и возвращает его URL. Используйте этот endpoint для одиночной загрузки.',
  })
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
      },
      required: ['file'],
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
          url: 'http://localhost:9000/demal-storage/images/1234567890-photo.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный формат файла' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async uploadSingleFile(
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

  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({
    summary: 'Загрузить несколько файлов списком',
    description:
      'Загружает несколько файлов одновременно и возвращает массив URLs. Поле в форме должно называться "files".',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Массив файлов для загрузки (максимум 10)',
        },
      },
      required: ['files'],
    },
  })
  @ApiQuery({
    name: 'type',
    enum: ['image', 'document'],
    description: 'Тип загружаемых файлов',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Файлы успешно загружены',
    schema: {
      example: {
        success: true,
        data: [
          {
            url: 'http://localhost:9000/demal-storage/images/1234567890-photo1.jpg',
          },
          {
            url: 'http://localhost:9000/demal-storage/images/1234567891-photo2.jpg',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный формат файлов' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('type') type: string,
  ) {
    if (!type || !['image', 'document'].includes(type)) {
      throw new Error('Type must be either "image" or "document"');
    }

    const fileType = type as FileType;
    const result = await this.uploadService.uploadMultipleFiles(
      files,
      fileType,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Post('with-keys')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Загрузить файлы с кастомными ключами',
    description:
      'Загружает файлы, где ключ формы - это имя поля, выбранное клиентом. Возвращает объект {ключ: URL}. ' +
      'Пример: отправьте файл с полем "mainImage" и получите {mainImage: "url"}. Можно использовать несколько ключей.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mainImage: {
          type: 'string',
          format: 'binary',
          description:
            'Пример: главное изображение (вы можете использовать любое имя поля)',
        },
        galleryImage1: {
          type: 'string',
          format: 'binary',
          description: 'Пример: изображение галереи 1',
        },
        galleryImage2: {
          type: 'string',
          format: 'binary',
          description: 'Пример: изображение галереи 2',
        },
      },
      description:
        'Используйте любые имена полей для файлов. Каждое поле должно содержать один файл.',
    },
  })
  @ApiQuery({
    name: 'type',
    enum: ['image', 'document'],
    description: 'Тип загружаемых файлов',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Файлы успешно загружены',
    schema: {
      example: {
        success: true,
        data: {
          mainImage:
            'http://localhost:9000/demal-storage/images/1234567890-main.jpg',
          galleryImage1:
            'http://localhost:9000/demal-storage/images/1234567891-gallery1.jpg',
          galleryImage2:
            'http://localhost:9000/demal-storage/images/1234567892-gallery2.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверный формат файлов' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async uploadWithKeys(
    @UploadedFiles()
    files: Express.Multer.File[] | Record<string, Express.Multer.File[]>,
    @Query('type') type: string,
  ) {
    if (!type || !['image', 'document'].includes(type)) {
      throw new Error('Type must be either "image" or "document"');
    }

    const fileType = type as FileType;

    // Преобразуем массив файлов в объект, если нужно
    let filesObject: Record<string, Express.Multer.File[]>;

    if (Array.isArray(files)) {
      // Если файлы пришли как массив, преобразуем в объект
      // Это может произойти, если все файлы были отправлены с одним полем
      throw new BadRequestException(
        'Files must be sent with different field names. Use field names like "mainImage", "galleryImage1", etc.',
      );
    } else {
      filesObject = files;
    }

    const result = await this.uploadService.uploadWithKeys(
      filesObject,
      fileType,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Delete()
  @ApiOperation({
    summary: 'Удалить файл',
    description: 'Удаляет файл по его URL. Операция необратима.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Полный URL файла',
        },
      },
      required: ['url'],
    },
  })
  @ApiResponse({ status: 200, description: 'Файл успешно удален' })
  @ApiResponse({ status: 400, description: 'Ошибка удаления' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async deleteFile(@Body('url') url: string) {
    await this.uploadService.deleteFile(url);
    return {
      success: true,
    };
  }

  // Старый endpoint оставлен для обратной совместимости, но перенаправляет на новый
  @Roles('CLIENT', 'PARTNER', 'ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Загрузить файл (legacy endpoint)',
    description:
      'Устаревший endpoint. Используйте /upload/single для загрузки одного файла.',
    deprecated: true,
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    enum: ['image', 'document'],
    description: 'Тип загружаемого файла',
    required: true,
  })
  async uploadFileLegacy(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    return this.uploadSingleFile(file, type);
  }
}
