import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FirebaseService } from '../firebase/firebase.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, FirebaseService],
  exports: [UploadService],
})
export class UploadModule {}
