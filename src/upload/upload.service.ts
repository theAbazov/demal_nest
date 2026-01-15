import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';
import { FileType } from './dto/upload-files.dto';

@Injectable()
export class UploadService {
  private bucketName: string;

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.bucketName =
      this.configService.get<string>('SUPABASE_BUCKET_NAME') || 'uploads';
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

    // Валидация типа файла
    this.validateFileType(file, type);

    // Валидация размера
    this.validateFileSize(file);

    // Определяем папку для загрузки
    const folder = customFolder || this.getFolderForType(type);

    try {
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      // Получаем публичный URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      console.log('Bucket:', this.bucketName);
      console.log('FileName:', fileName);
      console.log('Generated URL:', publicUrlData.publicUrl);
      console.log('Supabase URL Config:', this.configService.get('SUPABASE_URL'));

      return { url: publicUrlData.publicUrl };
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
      const supabase = this.supabaseService.getClient();
      
      const uploadPromises = files.map(async (file) => {
        const fileName = `${folder}/${Date.now()}-${file.originalname}`;
        
        const { error } = await supabase.storage
          .from(this.bucketName)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          throw new Error(error.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
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
      const supabase = this.supabaseService.getClient();

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

        const fileName = `${folder}/${Date.now()}-${file.originalname}`;

        const { error } = await supabase.storage
          .from(this.bucketName)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          throw new Error(error.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);
          
        result[key] = publicUrlData.publicUrl;
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
    const bucketIndex = fileUrl.indexOf(this.bucketName);
    
    if (bucketIndex === -1) {
       throw new BadRequestException('Invalid file URL or bucket mismatch');
    }

    // +1 для слэша
    const filePath = fileUrl.substring(bucketIndex + this.bucketName.length + 1);

    if (!filePath) {
      throw new BadRequestException('Could not parse file path from URL');
    }

    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
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
