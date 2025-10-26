"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
const storage_1 = require("firebase-admin/storage");
let FirebaseService = class FirebaseService {
    async onModuleInit() {
        if (!admin.apps.length) {
            const hasConfig = process.env.FIREBASE_PROJECT_ID &&
                process.env.FIREBASE_CLIENT_EMAIL &&
                process.env.FIREBASE_PRIVATE_KEY &&
                process.env.FIREBASE_STORAGE_BUCKET;
            if (!hasConfig) {
                console.warn('⚠️ Firebase credentials not configured. Skipping Firebase initialization.');
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
            }
            catch (error) {
                console.error('❌ Firebase initialization error:', error.message);
                console.warn('⚠️ Firebase services will not be available');
                return;
            }
        }
        try {
            this.storage = (0, storage_1.getStorage)();
        }
        catch (error) {
            console.error('❌ Failed to get Firebase Storage:', error.message);
        }
    }
    async uploadFile(file, folder) {
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
    async deleteFile(fileUrl) {
        if (!this.storage) {
            throw new Error('Firebase Storage is not initialized');
        }
        const bucket = this.storage.bucket();
        const filePath = fileUrl.split(`${bucket.name}/`)[1];
        if (filePath) {
            await bucket.file(filePath).delete();
        }
    }
    async getFileUrl(fileName) {
        if (!this.storage) {
            throw new Error('Firebase Storage is not initialized');
        }
        const bucket = this.storage.bucket();
        const file = bucket.file(fileName);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });
        return url;
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = __decorate([
    (0, common_1.Injectable)()
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map