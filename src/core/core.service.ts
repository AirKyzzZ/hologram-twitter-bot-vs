import {
  ApiClient,
  ApiVersion,
  EventHandler,
  StatProducerService,
  BaseMessage,
  ContextualMenuItem,
  ContextualMenuSelectMessage,
  ContextualMenuUpdateMessage,
  IdentityProofRequestMessage,
  IdentityProofSubmitMessage,
  MediaMessage,
  ProfileMessage,
  StatEnum,
  TextMessage,
  VerifiableCredentialRequestedProofItem,
  VerifiableCredentialSubmittedProofItem,
} from '@2060.io/vs-agent-nestjs-client'
import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { SessionEntity } from './models'
import { JsonTransformer } from '@credo-ts/core'
import { STAT_KPI } from './common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { StateStep } from './common/enums/state-step.enum'
import { Cmd } from './common/enums/cmd.enum'
import { ChatbotService } from '../chatbot/chatbot.service'
import { MemoryService } from '../memory/memory.service'
import { AgentContentService } from './agent-content.service'
import { TwitterService } from '../twitter/twitter.service'
import { ContentPipelineService } from '../twitter/content-pipeline.service'
import { TweetValidatorService } from '../twitter/tweet-validator.service'
import { RateLimitService } from '../twitter/rate-limit.service'
import { PostEntity, PostStatus } from '../twitter/models/post.entity'

@Injectable()
export class CoreService implements EventHandler, OnModuleInit {
  private readonly apiClient: ApiClient
  private readonly logger = new Logger(CoreService.name)

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    private readonly configService: ConfigService,
    private readonly chatBotService: ChatbotService,
    private readonly memoryService: MemoryService,
    @Optional() private readonly statProducer: StatProducerService,
    private readonly agentContent: AgentContentService,
    private readonly twitterService: TwitterService,
    private readonly contentPipeline: ContentPipelineService,
    private readonly tweetValidator: TweetValidatorService,
    private readonly rateLimitService: RateLimitService,
  ) {
    const baseUrl = configService.get<string>('appConfig.vsAgentAdminUrl') || 'http://localhost:3001'
    this.apiClient = new ApiClient(baseUrl, ApiVersion.V1)
    this.welcomeFlowConfig = this.agentContent.getWelcomeFlowConfig()
    this.authFlowConfig = this.agentContent.getAuthFlowConfig()
    this.credentialDefinitionId = this.authFlowConfig.credentialDefinitionId
  }

  private readonly welcomeFlowConfig: { enabled: boolean; sendOnProfile: boolean; templateKey: string }
  private readonly authFlowConfig: { enabled: boolean; credentialDefinitionId?: string }
  private readonly credentialDefinitionId?: string

  async onModuleInit() {}

  async inputMessage(message: BaseMessage): Promise<void> {
    let content
    const session: SessionEntity = await this.handleSession(message.connectionId)

    try {
      this.logger.debug('inputMessage: ' + JSON.stringify(message))

      switch (message.type) {
        case TextMessage.type:
          content = JsonTransformer.fromJSON(message, TextMessage)
          break
        case ContextualMenuSelectMessage.type: {
          const inMsg = JsonTransformer.fromJSON(
            message,
            ContextualMenuSelectMessage,
          ) as unknown as ContextualMenuSelectMessage
          const selectionId = inMsg.selectionId as string | undefined
          if (selectionId) {
            this.logger.debug(`ContextualMenuSelectMessage with selectionId: ${selectionId}`)
            await this.handleContextualAction(selectionId, session)
          } else {
            this.logger.warn(`Invalid or missing selectionId: ${selectionId}`)
          }
          return
        }
        case MediaMessage.type:
          content = 'media'
          break
        case ProfileMessage.type: {
          const inMsg = JsonTransformer.fromJSON(message, ProfileMessage) as unknown as ProfileMessage
          if (inMsg.preferredLanguage) {
            session.lang = inMsg.preferredLanguage
          }
          if (this.welcomeFlowConfig.enabled && this.welcomeFlowConfig.sendOnProfile) {
            await this.sendGreetingMessage(session.connectionId)
          }
          break
        }
        case IdentityProofSubmitMessage.type:
          content = JsonTransformer.fromJSON(message, IdentityProofSubmitMessage)
          break
        default:
          break
      }

      if (content != null) {
        if (typeof content === 'string') content = content.trim()
        if (typeof content === 'string' && content.length === 0) {
          content = null
        }
      }
    } catch (error) {
      this.logger.error(`inputMessage: ${error}`)
    }
    await this.handleStateInput(content, session)
  }

  async newConnection(connectionId: string): Promise<void> {
    const session = await this.handleSession(connectionId)
    await this.sendStats(STAT_KPI.USER_CONNECTED, session)
    await this.sendContextualMenu(session)
  }

  async closeConnection(connectionId: string): Promise<void> {
    const session = await this.handleSession(connectionId)
    await this.purgeUserData(session)
  }

  private async sendGreetingMessage(connectionId: string) {
    const userLang = (await this.handleSession(connectionId)).lang
    const greetingMessage = this.agentContent.getGreetingMessage(userLang, this.welcomeFlowConfig.templateKey)
    this.logger.debug(`Greeting: "${greetingMessage}"`)
    await this.sendText(connectionId, greetingMessage, userLang)
  }

  private async sendText(connectionId: string, text: string, lang: string) {
    await this.apiClient.messages.send(
      new TextMessage({
        connectionId: connectionId,
        content: this.getText(text, lang),
      }),
    )
  }

  private async sendRawText(connectionId: string, text: string) {
    await this.apiClient.messages.send(
      new TextMessage({
        connectionId: connectionId,
        content: text,
      }),
    )
  }

  private getText(key: string, lang: string): string {
    return this.agentContent.getString(lang ?? this.agentContent.getDefaultLanguage(), key)
  }

  private getTextWithReplace(key: string, lang: string, replacements: Record<string, string>): string {
    let text = this.getText(key, lang)
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v)
    }
    return text
  }

  private async handleContextualAction(selectionId: string, session: SessionEntity): Promise<void> {
    const { connectionId, lang } = session

    switch (selectionId) {
      // === MAIN MENU ACTIONS ===
      case Cmd.COMPOSE: {
        session.state = StateStep.COMPOSE
        session.draftContext = undefined
        await this.sessionRepository.save(session)
        await this.sendRawText(connectionId, this.getText('COMPOSE_PROMPT', lang))
        await this.sendContextualMenu(session)
        return
      }

      case Cmd.RECENT: {
        const recentPosts = await this.postRepository.find({
          where: { status: PostStatus.PUBLISHED },
          order: { publishedTs: 'DESC' },
          take: 5,
        })

        if (recentPosts.length === 0) {
          await this.sendRawText(connectionId, this.getText('RECENT_NONE', lang))
        } else {
          const handle = this.twitterService.twitterHandle
          let text = this.getTextWithReplace('RECENT_HEADER', lang, { handle }) + '\n\n'
          recentPosts.forEach((post, i) => {
            text += `${i + 1}. ${post.content}\n`
            if (post.tweetUrl) text += `   ${post.tweetUrl}\n`
            text += '\n'
          })
          await this.sendRawText(connectionId, text)
        }
        await this.sendContextualMenu(session)
        return
      }

      case Cmd.HELP: {
        const handle = this.twitterService.twitterHandle
        await this.sendRawText(connectionId, this.getTextWithReplace('HELP_TEXT', lang, { handle }))
        await this.sendContextualMenu(session)
        return
      }

      // === REVIEW_DRAFT ACTIONS ===
      case Cmd.APPROVE_1: {
        if (session.state !== StateStep.REVIEW_DRAFT || !session.draftContext?.drafts?.[0]) return
        session.draftContext.selectedDraft = 0
        session.state = StateStep.CONFIRM_PUBLISH
        await this.sessionRepository.save(session)
        const draft = session.draftContext.drafts[0]
        await this.sendRawText(
          connectionId,
          this.getTextWithReplace('CONFIRM_PROMPT', lang, { draft }),
        )
        await this.sendContextualMenu(session)
        return
      }

      case Cmd.APPROVE_2: {
        if (session.state !== StateStep.REVIEW_DRAFT || !session.draftContext?.drafts?.[1]) return
        session.draftContext.selectedDraft = 1
        session.state = StateStep.CONFIRM_PUBLISH
        await this.sessionRepository.save(session)
        const draft = session.draftContext.drafts[1]
        await this.sendRawText(
          connectionId,
          this.getTextWithReplace('CONFIRM_PROMPT', lang, { draft }),
        )
        await this.sendContextualMenu(session)
        return
      }

      case Cmd.REGENERATE: {
        if (session.state !== StateStep.REVIEW_DRAFT || !session.draftContext?.topic) return
        session.state = StateStep.COMPOSE
        await this.sessionRepository.save(session)
        // Re-trigger generation with same topic
        await this.handleCompose(session.draftContext.topic, session)
        return
      }

      case Cmd.EDIT: {
        if (session.state === StateStep.REVIEW_DRAFT) {
          session.state = StateStep.EDIT_DRAFT
          await this.sessionRepository.save(session)
          await this.sendRawText(connectionId, this.getText('EDIT_PROMPT', lang))
          await this.sendContextualMenu(session)
        } else if (session.state === StateStep.CONFIRM_PUBLISH) {
          session.state = StateStep.EDIT_DRAFT
          await this.sessionRepository.save(session)
          await this.sendRawText(connectionId, this.getText('EDIT_PROMPT', lang))
          await this.sendContextualMenu(session)
        }
        return
      }

      case Cmd.CANCEL: {
        session.state = StateStep.CHAT
        session.draftContext = undefined
        await this.sessionRepository.save(session)
        await this.sendRawText(connectionId, this.getText('CANCEL_CONFIRM', lang))
        await this.sendContextualMenu(session)
        return
      }

      // === CONFIRM_PUBLISH ACTIONS ===
      case Cmd.PUBLISH: {
        if (session.state !== StateStep.CONFIRM_PUBLISH || session.draftContext?.selectedDraft == null) return
        await this.handlePublish(session)
        return
      }

      // === AUTH ACTIONS (from original) ===
      case Cmd.AUTHENTICATE: {
        if (!this.authFlowConfig.enabled) return
        const credentialDefinitionId = this.credentialDefinitionId
        if (!credentialDefinitionId) {
          this.logger.error('Missing config: credentialDefinitionId')
          return
        }

        const body = new IdentityProofRequestMessage({
          connectionId,
          requestedProofItems: [],
        })
        const requestedProofItem = new VerifiableCredentialRequestedProofItem({
          id: '1',
          type: 'verifiable-credential',
          credentialDefinitionId,
        })
        body.requestedProofItems.push(requestedProofItem)
        await this.apiClient.messages.send(body)

        session.state = StateStep.AUTH
        await this.sessionRepository.save(session)
        this.logger.debug(`[AUTH] Proof request sent to ${connectionId}`)
        await this.sendText(connectionId, this.getText('AUTH_PROCESS_STARTED', lang), lang)
        return
      }

      case Cmd.LOGOUT: {
        session.isAuthenticated = false
        session.userName = ''
        session.draftContext = undefined
        await this.sessionRepository.save(session)
        await this.closeConnection(connectionId)
        await this.memoryService.clear(connectionId)
        return
      }

      default:
        this.logger.warn(`Unknown menu action: ${selectionId}`)
        return
    }
  }

  private async handleStateInput(content: unknown, session: SessionEntity): Promise<SessionEntity> {
    const { connectionId, lang: userLang } = session
    this.logger.debug(`handleStateInput state=${StateStep[session.state!]} content=${JSON.stringify(content)}`)

    try {
      switch (session.state) {
        // === CHAT state: text input triggers compose flow directly ===
        case StateStep.CHAT: {
          const textContent = this.extractTextContent(content)
          if (textContent) {
            // User sent a topic directly in chat — start compose flow
            await this.handleCompose(textContent, session)
            return session
          }
          break
        }

        // === COMPOSE state: waiting for topic input ===
        case StateStep.COMPOSE: {
          const textContent = this.extractTextContent(content)
          if (textContent) {
            await this.handleCompose(textContent, session)
            return session
          }
          break
        }

        // === REVIEW_DRAFT: text input in this state is ignored (use menu) ===
        case StateStep.REVIEW_DRAFT: {
          const textContent = this.extractTextContent(content)
          if (textContent) {
            await this.sendRawText(connectionId, this.getText('DRAFT_REVIEW_PROMPT', userLang))
            await this.sendContextualMenu(session)
          }
          break
        }

        // === EDIT_DRAFT: user sends edit instructions ===
        case StateStep.EDIT_DRAFT: {
          const textContent = this.extractTextContent(content)
          if (textContent && session.draftContext?.drafts) {
            const selectedIdx = session.draftContext.selectedDraft ?? 0
            const currentDraft = session.draftContext.drafts[selectedIdx] ?? session.draftContext.drafts[0]
            const newDrafts = await this.contentPipeline.editDraft(currentDraft, textContent)
            await this.sendDrafts(session, newDrafts, session.draftContext.topic)
          }
          break
        }

        // === CONFIRM_PUBLISH: text input is ignored (use menu) ===
        case StateStep.CONFIRM_PUBLISH: {
          const textContent = this.extractTextContent(content)
          if (textContent) {
            const draft = session.draftContext?.drafts?.[session.draftContext?.selectedDraft ?? 0] ?? ''
            await this.sendRawText(
              connectionId,
              this.getTextWithReplace('CONFIRM_PROMPT', userLang, { draft }),
            )
            await this.sendContextualMenu(session)
          }
          break
        }

        // === AUTH state (from original) ===
        case StateStep.AUTH: {
          if (
            typeof content === 'object' &&
            content !== null &&
            'type' in content &&
            (content as IdentityProofSubmitMessage).type === IdentityProofSubmitMessage.type &&
            'submittedProofItems' in content
          ) {
            const submitMessage = content as IdentityProofSubmitMessage
            const proofItem = submitMessage.submittedProofItems?.[0] as
              | VerifiableCredentialSubmittedProofItem
              | undefined

            if (proofItem?.type === VerifiableCredentialSubmittedProofItem.type && !proofItem.errorCode) {
              session.isAuthenticated = true

              const claims = proofItem.claims as { name: string; value: string }[] | undefined
              if (claims) {
                const firstName = claims.find((c) => c.name === 'firstName')?.value
                const lastName = claims.find((c) => c.name === 'lastName')?.value
                session.userName = [firstName, lastName].filter(Boolean).join(' ').trim()
              }

              session.state = StateStep.CHAT
              await this.sessionRepository.save(session)

              this.logger.debug(`[AUTH] User ${connectionId} authenticated successfully.`)
              const message = session.userName
                ? this.getTextWithReplace('AUTH_SUCCESS_NAME', userLang, { name: session.userName })
                : this.getText('AUTH_SUCCESS', userLang)

              await this.sendRawText(connectionId, message)
            } else if (proofItem?.errorCode) {
              this.logger.warn(`[AUTH] Proof submission failed with error: ${proofItem.errorCode}`)
              await this.sendRawText(connectionId, `${this.getText('AUTH_ERROR', userLang)}: ${proofItem.errorCode}`)
            } else {
              await this.sendRawText(connectionId, this.getText('WAITING_CREDENTIAL', userLang))
            }
          } else {
            await this.sendRawText(connectionId, this.getText('WAITING_CREDENTIAL', userLang))
          }
          break
        }

        default:
          break
      }
    } catch (error) {
      this.logger.error('handleStateInput: ' + error)
      await this.sendRawText(connectionId, this.getText('ERROR_MESSAGES', userLang))
    }
    return await this.sendContextualMenu(session)
  }

  // === COMPOSE FLOW ===

  private async handleCompose(topic: string, session: SessionEntity): Promise<void> {
    const { connectionId, lang } = session

    this.logger.log(`Generating drafts for topic: "${topic}"`)
    await this.sendRawText(connectionId, `Generating tweet drafts about "${topic}"...`)

    try {
      const drafts = await this.contentPipeline.generateDrafts(topic)
      await this.sendDrafts(session, drafts, topic)
    } catch (error) {
      this.logger.error(`Draft generation failed: ${error}`)
      await this.sendRawText(connectionId, this.getText('ERROR_MESSAGES', lang))
      session.state = StateStep.CHAT
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
    }
  }

  private async sendDrafts(session: SessionEntity, drafts: string[], topic: string): Promise<void> {
    const { connectionId, lang } = session
    const handle = this.twitterService.twitterHandle

    let text = this.getTextWithReplace('DRAFT_HEADER', lang, { handle }) + '\n\n'

    drafts.forEach((draft, i) => {
      const { length } = this.tweetValidator.validate(draft)
      text += `${this.getTextWithReplace('DRAFT_LABEL', lang, { n: String(i + 1), chars: String(length) })}\n`
      text += `${draft}\n\n`
    })

    session.state = StateStep.REVIEW_DRAFT
    session.draftContext = { drafts, topic }
    await this.sessionRepository.save(session)

    await this.sendRawText(connectionId, text)
    await this.sendContextualMenu(session)
  }

  private async handlePublish(session: SessionEntity): Promise<void> {
    const { connectionId, lang } = session
    const selectedIdx = session.draftContext?.selectedDraft ?? 0
    const content = session.draftContext?.drafts?.[selectedIdx]

    if (!content) {
      await this.sendRawText(connectionId, this.getText('NO_DRAFTS', lang))
      return
    }

    // Validate tweet length
    const validation = this.tweetValidator.validate(content)
    if (!validation.valid) {
      await this.sendRawText(connectionId, `Tweet is ${validation.length} characters (max 280). Please edit it shorter.`)
      session.state = StateStep.EDIT_DRAFT
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
      return
    }

    // Check rate limit
    const canPost = await this.rateLimitService.canPost()
    if (!canPost) {
      const budget = this.configService.get<string>('appConfig.dailyPostBudget') ?? '17'
      await this.sendRawText(connectionId, this.getTextWithReplace('RATE_LIMIT', lang, { budget }))
      session.state = StateStep.CHAT
      session.draftContext = undefined
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
      return
    }

    // Check if Twitter is configured
    if (!this.twitterService.isConfigured) {
      await this.sendRawText(connectionId, this.getText('TWITTER_NOT_CONFIGURED', lang))

      // Still save as draft
      const post = this.postRepository.create({
        content,
        status: PostStatus.DRAFT,
        topic: session.draftContext?.topic,
        connectionId,
      })
      await this.postRepository.save(post)

      session.state = StateStep.CHAT
      session.draftContext = undefined
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
      return
    }

    // Publish!
    try {
      const result = await this.twitterService.publishTweet(content)
      await this.rateLimitService.increment()

      // Save published post
      const post = this.postRepository.create({
        content,
        status: PostStatus.PUBLISHED,
        topic: session.draftContext?.topic,
        tweetId: result.tweetId,
        tweetUrl: result.tweetUrl,
        connectionId,
        publishedTs: new Date(),
      })
      await this.postRepository.save(post)

      const handle = this.twitterService.twitterHandle
      const remaining = await this.rateLimitService.getRemaining()
      const budget = this.configService.get<string>('appConfig.dailyPostBudget') ?? '17'

      let successMsg = this.getTextWithReplace('PUBLISH_SUCCESS', lang, {
        handle,
        url: result.tweetUrl,
        content,
      })
      successMsg += '\n\n' + this.getTextWithReplace('REMAINING_BUDGET', lang, {
        remaining: String(remaining),
        budget,
      })

      await this.sendRawText(connectionId, successMsg)

      session.state = StateStep.CHAT
      session.draftContext = undefined
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
    } catch (error) {
      this.logger.error(`Tweet publish failed: ${error}`)

      // Save as failed
      const post = this.postRepository.create({
        content,
        status: PostStatus.FAILED,
        topic: session.draftContext?.topic,
        connectionId,
      })
      await this.postRepository.save(post)

      const errorMsg = error instanceof Error ? error.message : String(error)
      await this.sendRawText(connectionId, this.getTextWithReplace('PUBLISH_FAILED', lang, { error: errorMsg }))

      session.state = StateStep.REVIEW_DRAFT
      await this.sessionRepository.save(session)
      await this.sendContextualMenu(session)
    }
  }

  // === SESSION & MENU ===

  private async handleSession(connectionId: string): Promise<SessionEntity> {
    let session = await this.sessionRepository.findOneBy({
      connectionId: connectionId,
    })
    this.logger.debug('handleSession session: ' + JSON.stringify(session))

    if (!session) {
      session = this.sessionRepository.create({
        connectionId: connectionId,
        state: StateStep.CHAT,
        isAuthenticated: false,
      })

      await this.sessionRepository.save(session)
      this.logger.debug('New session: ' + JSON.stringify(session))
    }
    return await this.sessionRepository.save(session)
  }

  private async purgeUserData(session: SessionEntity): Promise<SessionEntity> {
    session.state = StateStep.START
    session.draftContext = undefined
    return await this.sessionRepository.save(session)
  }

  private async sendContextualMenu(session: SessionEntity): Promise<SessionEntity> {
    const options: ContextualMenuItem[] = this.getMenuItemsForState(session).map(
      (item) =>
        new ContextualMenuItem({
          id: item.id,
          title: item.label ?? this.getText(item.labelKey ?? item.id, session.lang),
        }),
    )

    if (options.length === 0) {
      return await this.sessionRepository.save(session)
    }

    const handle = this.twitterService.twitterHandle
    const title =
      session.isAuthenticated && session.userName
        ? `${this.getText('ROOT_TITLE', session.lang)} — @${handle} — ${session.userName}`
        : `${this.getText('ROOT_TITLE', session.lang)} — @${handle}`

    await this.apiClient.messages.send(
      new ContextualMenuUpdateMessage({
        title,
        connectionId: session.connectionId,
        options,
        timestamp: new Date(),
      }),
    )
    return await this.sessionRepository.save(session)
  }

  private getMenuItemsForState(
    session: SessionEntity,
  ): { id: string; labelKey?: string; label?: string }[] {
    switch (session.state) {
      case StateStep.CHAT:
      case StateStep.COMPOSE: {
        const items: { id: string; labelKey: string }[] = [
          { id: Cmd.COMPOSE, labelKey: 'COMPOSE_TWEET' },
          { id: Cmd.RECENT, labelKey: 'RECENT_TWEETS' },
          { id: Cmd.HELP, labelKey: 'HELP' },
        ]
        // Add auth options if auth is enabled
        if (this.authFlowConfig.enabled && this.credentialDefinitionId && !session.isAuthenticated) {
          items.push({ id: Cmd.AUTHENTICATE, labelKey: 'CREDENTIAL' })
        }
        if (session.isAuthenticated) {
          items.push({ id: Cmd.LOGOUT, labelKey: 'LOGOUT' })
        }
        return items
      }

      case StateStep.REVIEW_DRAFT: {
        const items: { id: string; labelKey: string }[] = [
          { id: Cmd.APPROVE_1, labelKey: 'APPROVE_DRAFT_1' },
        ]
        if (session.draftContext?.drafts?.length && session.draftContext.drafts.length > 1) {
          items.push({ id: Cmd.APPROVE_2, labelKey: 'APPROVE_DRAFT_2' })
        }
        items.push(
          { id: Cmd.REGENERATE, labelKey: 'REGENERATE' },
          { id: Cmd.EDIT, labelKey: 'EDIT_DRAFT' },
          { id: Cmd.CANCEL, labelKey: 'CANCEL' },
        )
        return items
      }

      case StateStep.EDIT_DRAFT:
        return [{ id: Cmd.CANCEL, labelKey: 'CANCEL' }]

      case StateStep.CONFIRM_PUBLISH:
        return [
          { id: Cmd.PUBLISH, labelKey: 'PUBLISH' },
          { id: Cmd.EDIT, labelKey: 'EDIT_DRAFT' },
          { id: Cmd.CANCEL, labelKey: 'CANCEL' },
        ]

      case StateStep.AUTH:
        return []

      default:
        return [{ id: Cmd.HELP, labelKey: 'HELP' }]
    }
  }

  // === UTILS ===

  private extractTextContent(content: unknown): string | null {
    if (
      typeof content === 'object' &&
      content !== null &&
      'content' in content &&
      typeof (content as Record<string, unknown>).content === 'string'
    ) {
      const text = (content as { content: string }).content.trim()
      return text.length > 0 ? text : null
    }
    return null
  }

  async sendStats(kpi: STAT_KPI, session: SessionEntity) {
    if (!this.statProducer) return
    this.logger.debug(`***send stats***`)
    const stats = [STAT_KPI[kpi]]
    if (session !== null) await this.statProducer.spool(stats, session.connectionId, [new StatEnum(0, 'string')])
  }
}
