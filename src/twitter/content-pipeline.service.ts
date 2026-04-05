import { Injectable, Logger } from '@nestjs/common'
import { LlmService } from '../llm/llm.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PostEntity, PostStatus } from './models/post.entity'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ContentPipelineService {
  private readonly logger = new Logger(ContentPipelineService.name)

  constructor(
    private readonly llmService: LlmService,
    private readonly config: ConfigService,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
  ) {}

  async generateDrafts(topic: string): Promise<string[]> {
    const recentPosts = await this.getRecentPosts(10)
    const handle = this.config.get<string>('appConfig.twitterHandle') ?? ''
    const systemPrompt = this.config.get<string>('appConfig.agentPrompt') ?? ''

    const prompt = this.buildTweetPrompt({
      systemPrompt,
      recentPosts: recentPosts.map((p) => p.content),
      topic,
      handle,
    })

    this.logger.debug(`Generating drafts for topic: "${topic}"`)
    const response = await this.llmService.generate(prompt)
    return this.parseDrafts(response)
  }

  async editDraft(currentDraft: string, editInstructions: string): Promise<string[]> {
    const prompt =
      `You are a tweet editor. Here is the current draft:\n\n"${currentDraft}"\n\n` +
      `The user wants the following changes: ${editInstructions}\n\n` +
      `RULES:\n` +
      `1. Every tweet MUST be under 280 characters.\n` +
      `2. Provide exactly 2 revised versions.\n\n` +
      `Format:\n---DRAFT 1---\n[tweet text]\n---END---\n\n---DRAFT 2---\n[tweet text]\n---END---`

    const response = await this.llmService.generate(prompt)
    return this.parseDrafts(response)
  }

  private buildTweetPrompt(options: {
    systemPrompt: string
    recentPosts: string[]
    topic: string
    handle: string
  }): string {
    const recentSection =
      options.recentPosts.length > 0
        ? `RECENT POSTS (avoid repetition):\n${options.recentPosts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
        : 'No recent posts yet.'

    return `${options.systemPrompt}

TWITTER ACCOUNT: @${options.handle}

${recentSection}

RULES:
1. Every tweet MUST be under 280 characters. Count carefully.
2. Each draft should take a different angle on the topic.
3. No generic motivational content. Be specific and substantive.
4. Never start with "Just" or generic openers.
5. Do NOT include hashtags unless specifically requested.

TASK:
Generate 2 tweet drafts about: ${options.topic}

Format your response EXACTLY like this:
---DRAFT 1---
[tweet text here]
---END---

---DRAFT 2---
[tweet text here]
---END---`
  }

  private parseDrafts(response: string): string[] {
    const drafts: string[] = []
    const regex = /---DRAFT \d+---\s*\n([\s\S]*?)---END---/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(response)) !== null) {
      const draft = match[1].trim()
      if (draft.length > 0) {
        drafts.push(draft)
      }
    }

    // Fallback: if parsing fails, try to split by numbered lines
    if (drafts.length === 0) {
      const lines = response
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('---') && !/^\d+\.\s*$/.test(l))

      // Try to find lines that look like tweets (under 300 chars, not instructions)
      for (const line of lines) {
        if (line.length > 10 && line.length < 300 && !line.includes('DRAFT') && !line.includes('character')) {
          drafts.push(line.replace(/^\d+\.\s*/, ''))
          if (drafts.length >= 2) break
        }
      }
    }

    if (drafts.length === 0) {
      drafts.push(response.trim().slice(0, 280))
    }

    return drafts.slice(0, 2)
  }

  private async getRecentPosts(limit: number): Promise<PostEntity[]> {
    return this.postRepository.find({
      where: { status: PostStatus.PUBLISHED },
      order: { publishedTs: 'DESC' },
      take: limit,
    })
  }
}
