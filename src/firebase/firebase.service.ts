import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private storage: admin.storage.Storage;

  async onModuleInit() {
    // Инициализация Firebase Admin SDK
    if (!admin.apps.length) {
      // Проверяем наличие всех необходимых переменных
      const hasConfig =
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_STORAGE_BUCKET;

      if (!hasConfig) {
        console.warn(
          '⚠️ Firebase credentials not configured. Skipping Firebase initialization.',
        );
        return;
      }

      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        console.log('✅ Firebase Admin initialized');
      } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
        console.warn('⚠️ Firebase services will not be available');
        return;
      }
    }

    try {
      this.storage = getStorage();
    } catch (error) {
      console.error('❌ Failed to get Firebase Storage:', error.message);
    }
  }

  /**
   * Загрузка файла в Firebase Storage
   */
  async uploadFile(file: UploadedFile, folder: string): Promise<string> {
    if (!this.storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    const bucket = this.storage.bucket();
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    const fileRef = bucket.file(fileName);

    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', async () => {
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      });

      stream.end(file.buffer);
    });
  }

  /**
   * Удаление файла из Firebase Storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    const bucket = this.storage.bucket();
    // Извлекаем путь к файлу из URL
    const filePath = fileUrl.split(`${bucket.name}/`)[1];
    if (filePath) {
      await bucket.file(filePath).delete();
    }
  }

  /**
   * Получение URL файла
   */
  async getFileUrl(fileName: string): Promise<string> {
    if (!this.storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    const bucket = this.storage.bucket();
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Очень далекая дата для постоянных ссылок
    });
    return url;
  }
}
