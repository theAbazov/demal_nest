import { Injectable, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
}

@Injectable()
export class UploadService {
  constructor(private firebaseService: FirebaseService) {}

  async uploadFile(
    file: Express.Multer.File,
    type: FileType,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Валидация типа файла
    this.validateFileType(file, type);

    // Валидация размера
    this.validateFileSize(file);

    // Определяем папку для загрузки
    const folder = this.getFolderForType(type);

    try {
      // Загружаем файл в Firebase
      const fileData = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      };

      const url = await this.firebaseService.uploadFile(fileData, folder);

      return { url };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
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
