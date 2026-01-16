
import { MinioService } from '../src/minio/minio.service';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MinioModule } from '../src/minio/minio.module';
import * as Minio from 'minio';

async function bootstrap() {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot(), MinioModule],
  }).compile();

  // Try default credentials for testing if not provided
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  
  if (!accessKey || !secretKey) {
      console.error('Please provide MINIO_ACCESS_KEY and MINIO_SECRET_KEY');
      return;
  }
  
  // Re-initialize client with explicit defaults for this test script
  // We bypass the service initialization to force these creds for the test
  const minioClient = new Minio.Client({
      endPoint: '109.73.202.55',
      port: 9000,
      useSSL: false,
      accessKey: accessKey,
      secretKey: secretKey,
  });

  console.log(`Testing connection with AccessKey: ${accessKey}`);

  console.log('Checking MinIO connection...');
  try {
    const buckets = await minioClient.listBuckets();
    console.log('Connection successful!');
    console.log('Buckets:', buckets.map(b => b.name));

    const bucketName = 'uploads'; // Default bucket
    const bucketExists = await minioClient.bucketExists(bucketName);
    
    if (bucketExists) {
        console.log(`Bucket '${bucketName}' exists.`);
    } else {
        console.log(`Bucket '${bucketName}' does NOT exist.`);
        console.log(`Creating bucket '${bucketName}'...`);
        await minioClient.makeBucket(bucketName, 'us-east-1'); // Region is required but often ignored by MinIO standalone
        console.log(`Bucket '${bucketName}' created.`);
        
        // Make it public (read-only)
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${bucketName}/*`],
                },
            ],
        };
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`Bucket '${bucketName}' policy set to public read.`);
    }

  } catch (err) {
    console.error('Failed to connect or list buckets:', err);
  }

  // await app.close();
}

bootstrap();
