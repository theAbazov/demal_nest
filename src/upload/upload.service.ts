import { Injectable, BadRequestException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { FileType } from './dto/upload-files.dto';

@Injectable()
export class UploadService {
  constructor(private minioService: MinioService) {}

  /**
   * Загрузка одного файла
   */
  async uploadFile(
    file: Express.Multer.File,
    type: FileType,
    customFolder?: string,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Валидация типа файла
    this.validateFileType(file, type);

    // Валидация размера
    this.validateFileSize(file);

    // Определяем папку для загрузки
    const folder = customFolder || this.getFolderForType(type);

    try {
      // Загружаем файл в MinIO
      const fileData = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      };

      const url = await this.minioService.uploadFile(fileData, folder);

      return { url };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Загрузка нескольких файлов списком
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    type: FileType,
    customFolder?: string,
  ): Promise<{ url: string }[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Валидация всех файлов
    files.forEach((file) => {
      this.validateFileType(file, type);
      this.validateFileSize(file);
    });

    // Определяем папку для загрузки
    const folder = customFolder || this.getFolderForType(type);

    try {
      // Загружаем все файлы параллельно
      const uploadPromises = files.map((file) => {
        const fileData = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
        };

        return this.minioService.uploadFile(fileData, folder);
      });

      const urls = await Promise.all(uploadPromises);

      return urls.map((url) => ({ url }));
    } catch (error) {
      throw new BadRequestException(`Failed to upload files: ${error.message}`);
    }
  }

  /**
   * Загрузка файлов с кастомными ключами (key-value)
   * Где ключ - имя поля, выбранное клиентом
   */
  async uploadWithKeys(
    files: Record<string, Express.Multer.File[]>,
    type: FileType,
    customFolder?: string,
  ): Promise<Record<string, string>> {
    if (!files || Object.keys(files).length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Определяем папку для загрузки
    const folder = customFolder || this.getFolderForType(type);

    try {
      const result: Record<string, string> = {};

      // Загружаем файлы для каждого ключа
      for (const [key, fileArray] of Object.entries(files)) {
        if (!fileArray || fileArray.length === 0) {
          throw new BadRequestException(`No file provided for key: ${key}`);
        }

        // Если несколько файлов для одного ключа, берем первый
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        // Валидация
        this.validateFileType(file, type);
        this.validateFileSize(file);

        // Загружаем файл
        const fileData = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
        };

        const url = await this.minioService.uploadFile(fileData, folder);
        result[key] = url;
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload files with keys: ${error.message}`,
      );
    }
  }

  private validateFileType(file: Express.Multer.File, type: FileType) {
    if (type === FileType.IMAGE) {
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
        );
      }
    } else if (type === FileType.DOCUMENT) {
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only PDF and DOC files are allowed.',
        );
      }
    }
  }

  private validateFileSize(file: Express.Multer.File) {
    // Максимальный размер: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size exceeds the maximum allowed size of 10MB.',
      );
    }
  }

  private getFolderForType(type: FileType): string {
    switch (type) {
      case FileType.IMAGE:
        return 'images';
      case FileType.DOCUMENT:
        return 'documents';
      default:
        return 'files';
    }
  }
}
