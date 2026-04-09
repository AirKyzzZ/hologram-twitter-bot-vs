import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { StateStep } from '../common'

@Entity('session')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', nullable: false })
  connectionId: string

  @Column({ type: 'varchar', length: 10, nullable: true })
  lang: string

  @Column({
    type: 'enum',
    enum: StateStep,
  })
  state?: StateStep

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date

  @Column({ default: false, nullable: true })
  isAuthenticated?: boolean

  @Column({ nullable: true })
  userName?: string

  @Column({ type: 'jsonb', nullable: true })
  draftContext?: {
    drafts: string[]
    topic: string
    selectedDraft?: number
    imageUrl?: string
    imageBase64?: string
    imageMimeType?: string
  }
}
