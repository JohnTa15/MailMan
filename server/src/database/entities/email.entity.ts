import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @Column({ nullable: true })
  threadId: string;

  @Column()
  subject: string;

  @Column({ nullable: true })
  from: string;

  @Column({ nullable: true })
  fromName: string;

  @Column({ nullable: true })
  to: string;

  @Column({ nullable: true })
  toName: string;

  @Column('text')
  body: string;

  @Column('text', { nullable: true })
  html: string;

  @Column({ nullable: true })
  preview: string;

  @Column({ type: 'datetime' })
  date: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isStarred: boolean;

  @Column({ default: false })
  isImportant: boolean;

  @Column('simple-array', { nullable: true })
  labels: string[];

  @Column({ default: 'inbox' })
  folder: string;

  @Column({ nullable: true })
  messageId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
