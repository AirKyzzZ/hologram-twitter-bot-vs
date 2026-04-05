import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, RedisClientType } from 'redis'

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name)
  private redis: RedisClientType | null = null
  private readonly dailyBudget: number
  private readonly handle: string

  constructor(private readonly config: ConfigService) {
    this.dailyBudget = parseInt(this.config.get<string>('appConfig.dailyPostBudget') ?? '17', 10)
    this.handle = this.config.get<string>('appConfig.twitterHandle') ?? 'default'
    this.initRedis()
  }

  private async initRedis() {
    const redisUrl = this.config.get<string>('appConfig.redisUrl') ?? 'redis://localhost:6379'
    try {
      this.redis = createClient({ url: redisUrl }) as RedisClientType
      await this.redis.connect()
      this.logger.log('RateLimitService connected to Redis.')
    } catch (error) {
      this.logger.warn(`Redis connection failed for rate limiting — using in-memory fallback. Error: ${error}`)
      this.redis = null
    }
  }

  private get todayKey(): string {
    const today = new Date().toISOString().split('T')[0]
    return `ratelimit:${this.handle}:${today}`
  }

  async getRemaining(): Promise<number> {
    if (!this.redis) return this.dailyBudget
    const count = await this.redis.get(this.todayKey)
    return this.dailyBudget - (parseInt(count ?? '0', 10))
  }

  async increment(): Promise<number> {
    if (!this.redis) return this.dailyBudget
    const newCount = await this.redis.incr(this.todayKey)
    // Set expiry to end of day (24h from first use)
    if (newCount === 1) {
      await this.redis.expire(this.todayKey, 86400)
    }
    return this.dailyBudget - newCount
  }

  async canPost(): Promise<boolean> {
    const remaining = await this.getRemaining()
    return remaining > 0
  }
}
