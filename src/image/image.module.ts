import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ImageGenerationService } from './image-generation.service'
import { MinioService } from './minio.service'

@Module({
  imports: [ConfigModule],
  providers: [ImageGenerationService, MinioService],
  exports: [ImageGenerationService, MinioService],
})
export class ImageModule {}
