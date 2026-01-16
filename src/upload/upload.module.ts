import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
// import { SupabaseService } from '../common/services/supabase.service'; // Removed
import { MinioModule } from '../minio/minio.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, MinioModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
