import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import { randomUUID } from 'crypto'

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name)
  private client: Minio.Client | null = null
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('appConfig.minioBucket') ?? 'twitter-bot-images'
    this.publicUrl = this.config.get<string>('appConfig.minioPublicUrl') ?? 'http://localhost:9000'
  }

  async onModuleInit() {
    const endpoint = this.config.get<string>('appConfig.minioEndpoint')
    const port = this.config.get<number>('appConfig.minioPort')
    const accessKey = this.config.get<string>('appConfig.minioAccessKey')
    const secretKey = this.config.get<string>('appConfig.minioSecretKey')

    if (!endpoint || !accessKey || !secretKey) {
      this.logger.warn('MinIO not configured — image storage will be disabled.')
      return
    }

    try {
      this.client = new Minio.Client({
        endPoint: endpoint,
        port: port ?? 9000,
        useSSL: false,
        accessKey,
        secretKey,
      })

      const bucketExists = await this.client.bucketExists(this.bucket)
      if (!bucketExists) {
        await this.client.makeBucket(this.bucket)
        // Set bucket policy to allow public read
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
        this.logger.log(`Created MinIO bucket: ${this.bucket}`)
      }

      this.logger.log(`MinIO connected — bucket: ${this.bucket}`)
    } catch (error) {
      this.logger.warn(`MinIO initialization failed: ${error instanceof Error ? error.message : String(error)}`)
      this.client = null
    }
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  async upload(buffer: Buffer, mimeType: string, extension: string): Promise<{ url: string; objectName: string }> {
    if (!this.client) {
      throw new Error('MinIO is not configured')
    }

    const objectName = `${randomUUID()}.${extension}`

    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    })

    const url = `${this.publicUrl}/${this.bucket}/${objectName}`
    this.logger.debug(`Uploaded to MinIO: ${url}`)
    return { url, objectName }
  }
}
