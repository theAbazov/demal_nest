import { Injectable, BadRequestException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { ConfigService } from '@nestjs/config';
import { FileType } from './dto/upload-files.dto';

@Injectable()
export class UploadService {
  constructor(
    private minioService: MinioService,
    private configService: ConfigService,
  ) {
  }

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

    this.validateFileType(file, type);

    this.validateFileSize(file);

    const folder = customFolder || this.getFolderForType(type);

    try {
      const fileName = `${folder}/${Date.now()}-${this.sanitizeFileName(file.originalname)}`;
      
    const result=  await this.minioService.client.putObject(
        this.minioService.bucket,
        fileName,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

     
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '109.73.202.55';
      const port = this.configService.get<string>('MINIO_PORT') || '9000';
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      
      const publicUrl = `${protocol}://${endpoint}:${port}/${this.minioService.bucket}/${fileName}`;

      console.log('Bucket:', this.minioService.bucket);
      console.log('FileName:', fileName);
      console.log('Generated URL:', publicUrl);

      return { url: publicUrl };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

 
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
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '109.73.202.55';
      const port = this.configService.get<string>('MINIO_PORT') || '9000';
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      const baseUrl = `${protocol}://${endpoint}:${port}/${this.minioService.bucket}`;

      const uploadPromises = files.map(async (file) => {
        const fileName = `${folder}/${Date.now()}-${this.sanitizeFileName(file.originalname)}`;
        
        await this.minioService.client.putObject(
          this.minioService.bucket,
          fileName,
          file.buffer,
          file.size,
          { 'Content-Type': file.mimetype },
        );

        return `${baseUrl}/${fileName}`;
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
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '109.73.202.55';
      const port = this.configService.get<string>('MINIO_PORT') || '9000';
      const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      const baseUrl = `${protocol}://${endpoint}:${port}/${this.minioService.bucket}`;


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

        const fileName = `${folder}/${Date.now()}-${this.sanitizeFileName(file.originalname)}`;

        await this.minioService.client.putObject(
          this.minioService.bucket,
          fileName,
          file.buffer,
          file.size,
          { 'Content-Type': file.mimetype },
        );
          
        result[key] = `${baseUrl}/${fileName}`;
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload files with keys: ${error.message}`,
      );
    }
  }

  /**
   * Удаление файла по URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) {
      throw new BadRequestException('No file URL provided');
    }

    // URL формат: http://domain/.../bucketName/folder/filename
    // Мы ищем bucketName в URL и берем все что после него
    const bucketName = this.minioService.bucket;
    const bucketIndex = fileUrl.indexOf(bucketName);
    
    if (bucketIndex === -1) {
       throw new BadRequestException('Invalid file URL or bucket mismatch');
    }

    // +1 для слэша
    const filePath = fileUrl.substring(bucketIndex + bucketName.length + 1);

    if (!filePath) {
      throw new BadRequestException('Could not parse file path from URL');
    }

    try {
      await this.minioService.client.removeObject(bucketName, filePath);
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
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
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size exceeds the maximum allowed size of 10MB.',
      );
    }
  }



  private sanitizeFileName(originalName: string): string {
    return originalName.replace(/\s+/g, '-').replace(/[()]/g, '');
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
