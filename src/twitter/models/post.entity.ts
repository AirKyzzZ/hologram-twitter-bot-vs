import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'varchar', length: 20, default: PostStatus.DRAFT })
  status: PostStatus

  @Column({ nullable: true })
  topic: string

  @Column({ nullable: true })
  tweetId: string

  @Column({ nullable: true })
  tweetUrl: string

  @Column({ nullable: true })
  connectionId: string

  @CreateDateColumn()
  createdTs: Date

  @Column({ type: 'timestamp', nullable: true })
  publishedTs: Date
}
