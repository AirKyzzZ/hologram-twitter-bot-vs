import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TwitterService } from './twitter.service'
import { TweetValidatorService } from './tweet-validator.service'
import { RateLimitService } from './rate-limit.service'
import { ContentPipelineService } from './content-pipeline.service'
import { PostEntity } from './models/post.entity'
import { LlmModule } from '../llm/llm.module'

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity]), LlmModule],
  providers: [TwitterService, TweetValidatorService, RateLimitService, ContentPipelineService],
  exports: [TwitterService, TweetValidatorService, RateLimitService, ContentPipelineService, TypeOrmModule],
})
export class TwitterModule {}
