import { Injectable } from '@nestjs/common'

@Injectable()
export class TweetValidatorService {
  static readonly MAX_LENGTH = 280
  static readonly URL_LENGTH = 23

  countCharacters(text: string): number {
    let count = 0
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = text.match(urlRegex) || []

    let textWithoutUrls = text
    for (const url of urls) {
      textWithoutUrls = textWithoutUrls.replace(url, '')
      count += TweetValidatorService.URL_LENGTH
    }

    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0)!
      count += code > 0xffff ? 2 : 1
    }

    return count
  }

  validate(text: string): { valid: boolean; length: number } {
    const length = this.countCharacters(text)
    return { valid: length > 0 && length <= TweetValidatorService.MAX_LENGTH, length }
  }
}
