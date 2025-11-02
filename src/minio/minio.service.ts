import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private publicUrl: string;

  async onModuleInit() {
    // Проверяем наличие всех необходимых переменных
    const hasConfig =
      process.env.MINIO_ENDPOINT &&
      process.env.MINIO_PORT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY &&
      process.env.MINIO_BUCKET_NAME &&
      process.env.MINIO_PUBLIC_URL;

    if (!hasConfig) {
      this.logger.warn(
        '⚠️ MinIO credentials not configured. Skipping MinIO initialization.',
      );
      return;
    }

    try {
      const useSSL = process.env.MINIO_USE_SSL === 'true';
      const port = parseInt(process.env.MINIO_PORT || '9000', 10);

      this.minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: port,
        useSSL: useSSL,
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
      });

      this.bucketName = process.env.MINIO_BUCKET_NAME;
      this.publicUrl = process.env.MINIO_PUBLIC_URL;

      // Проверяем, существует ли bucket, если нет - создаем
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);

      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, '');
        this.logger.log(`✅ Created bucket: ${this.bucketName}`);

        // Устанавливаем политику для публичного доступа
        try {
          await this.minioClient.setBucketPolicy(
            this.bucketName,
            JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: ['*'] },
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${this.bucketName}/*`],
                },
              ],
            }),
          );
          this.logger.log(
            `✅ Set public read policy for bucket: ${this.bucketName}`,
          );
        } catch (error) {
          this.logger.warn(`⚠️ Could not set bucket policy: ${error.message}`);
        }
      } else {
        this.logger.log(`✅ Bucket exists: ${this.bucketName}`);
      }

      this.logger.log('✅ MinIO client initialized successfully');
    } catch (error) {
      this.logger.error('❌ MinIO initialization error:', error.message);
      this.logger.warn('⚠️ MinIO services will not be available');
    }
  }

  /**
   * Загрузка файла в MinIO Storage
   */
  async uploadFile(file: UploadedFile, folder: string): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client is not initialized');
    }

    try {
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      const metaData = {
        'Content-Type': file.mimetype,
      };

      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.buffer.length,
        metaData,
      );

      // Возвращаем публичный URL
      const publicUrl = `${this.publicUrl}/${this.bucketName}/${fileName}`;
      this.logger.log(`✅ File uploaded: ${fileName}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to upload file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Удаление файла из MinIO Storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client is not initialized');
    }

    try {
      // Извлекаем путь к файлу из URL
      // Формат URL: http://domain/bucket-name/path/to/file
      const urlParts = fileUrl.split(`/${this.bucketName}/`);
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL format');
      }

      const objectName = urlParts[1];
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`✅ File deleted: ${objectName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Получение подписанного URL для временного доступа к файлу
   */
  async getPresignedUrl(
    fileName: string,
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client is not initialized');
    }

    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        fileName,
        expiry,
      );
      return url;
    } catch (error) {
      this.logger.error(`❌ Failed to get presigned URL: ${error.message}`);
      throw new Error(`Failed to get presigned URL: ${error.message}`);
    }
  }

  /**
   * Получение публичного URL файла
   */
  async getFileUrl(fileName: string): Promise<string> {
    if (!this.minioClient) {
      throw new Error('MinIO client is not initialized');
    }

    // Возвращаем публичный URL напрямую
    return `${this.publicUrl}/${this.bucketName}/${fileName}`;
  }

  /**
   * Проверка существования файла
   */
  async fileExists(fileName: string): Promise<boolean> {
    if (!this.minioClient) {
      throw new Error('MinIO client is not initialized');
    }

    try {
      await this.minioClient.statObject(this.bucketName, fileName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}
