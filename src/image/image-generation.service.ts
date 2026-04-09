import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name)
  private readonly openai: OpenAI | null = null
  private readonly enabled: boolean

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('appConfig.imageEnabled') ?? false
    const apiKey = this.config.get<string>('appConfig.openaiApiKey')

    if (this.enabled && apiKey) {
      this.openai = new OpenAI({ apiKey })
      this.logger.log('Image generation enabled (DALL-E 3)')
    } else {
      this.logger.warn('Image generation disabled — set IMAGE_ENABLED=true and OPENAI_API_KEY')
    }
  }

  get isConfigured(): boolean {
    return this.enabled && this.openai !== null
  }

  async generate(prompt: string): Promise<Buffer> {
    if (!this.openai) {
      throw new Error('Image generation is not configured')
    }

    this.logger.debug(`Generating image: "${prompt.slice(0, 100)}..."`)

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    })

    const b64 = response.data?.[0]?.b64_json
    if (!b64) {
      throw new Error('DALL-E returned no image data')
    }

    return Buffer.from(b64, 'base64')
  }

  async generatePromptFromTweet(tweetContent: string): Promise<string> {
    if (!this.openai) {
      throw new Error('Image generation is not configured')
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You generate DALL-E image prompts for tweet illustrations. Create a concise, visual prompt that complements the tweet content. Focus on clean, professional imagery suitable for social media. No text in the image. Max 200 characters.',
        },
        { role: 'user', content: `Generate an image prompt for this tweet:\n\n"${tweetContent}"` },
      ],
      max_tokens: 100,
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content?.trim() ?? `Professional illustration for: ${tweetContent.slice(0, 100)}`
  }
}
