import { OnModuleInit } from '@nestjs/common';
interface UploadedFile {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
}
export declare class FirebaseService implements OnModuleInit {
    private storage;
    onModuleInit(): Promise<void>;
    uploadFile(file: UploadedFile, folder: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
    getFileUrl(fileName: string): Promise<string>;
}
export {};
