import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TwitterApi } from 'twitter-api-v2'

@Injectable()
export class TwitterService implements OnModuleInit {
  private readonly logger = new Logger(TwitterService.name)
  private client: TwitterApi | null = null
  private readonly handle: string

  constructor(private readonly config: ConfigService) {
    this.handle = this.config.get<string>('appConfig.twitterHandle') ?? ''
  }

  async onModuleInit() {
    const appKey = this.config.get<string>('appConfig.twitterAppKey')
    const appSecret = this.config.get<string>('appConfig.twitterAppSecret')
    const accessToken = this.config.get<string>('appConfig.twitterAccessToken')
    const accessSecret = this.config.get<string>('appConfig.twitterAccessSecret')

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
      this.logger.warn('Twitter API credentials not configured — posting will be disabled.')
      return
    }

    this.client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    })

    // Verify credentials using v1.1 (works without Project enrollment)
    try {
      const me = await this.client.v1.verifyCredentials()
      this.logger.log(`Twitter authenticated as @${me.screen_name} (${me.name})`)
    } catch (error) {
      this.logger.warn(
        `Twitter auth verification failed (${error instanceof Error ? error.message : String(error)}). ` +
          'Posting may fail — check app permissions at developer.x.com.',
      )
    }
  }

  get isConfigured(): boolean {
    return this.client !== null
  }

  get twitterHandle(): string {
    return this.handle
  }

  async publishTweet(content: string, mediaIds?: string[]): Promise<{ tweetId: string; tweetUrl: string }> {
    if (!this.client) {
      throw new Error('Twitter client not configured — cannot publish.')
    }

    // Try v2 first, fall back to v1.1 if it fails (v2 requires Project enrollment)
    try {
      const result = mediaIds?.length
        ? await this.client.v2.tweet({ text: content, media: { media_ids: mediaIds as [string] } })
        : await this.client.v2.tweet(content)
      const tweetId = result.data.id
      const tweetUrl = `https://x.com/${this.handle}/status/${tweetId}`
      this.logger.log(`Tweet published via v2: ${tweetUrl}`)
      return { tweetId, tweetUrl }
    } catch (v2Error) {
      this.logger.warn(`v2 API failed (${v2Error instanceof Error ? v2Error.message : String(v2Error)}), trying v1.1...`)

      // Fallback to v1.1 statuses/update
      const result = await this.client.v1.tweet(content)
      const tweetId = result.id_str
      const tweetUrl = `https://x.com/${this.handle}/status/${tweetId}`
      this.logger.log(`Tweet published via v1.1: ${tweetUrl}`)
      return { tweetId, tweetUrl }
    }
  }
}
