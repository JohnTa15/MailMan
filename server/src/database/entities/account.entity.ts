import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type MailboxType = 'imap' | 'ews' | 'gmail' | 'outlook' | 'yahoo' | 'icloud';

/** A connected mailbox (IMAP/SMTP), owned by a user. */
@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'text', nullable: true })
  userId: string | null;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ default: 'imap' })
  type: MailboxType;

  /** 'password': stored IMAP/app password; 'oauth2': Google/Microsoft tokens */
  @Column({ type: 'text', default: 'password' })
  authType: 'password' | 'oauth2';

  @Column({ type: 'datetime', nullable: true })
  tokenExpiresAt: Date | null;

  // IMAP settings
  @Column({ nullable: true })
  imapHost: string;

  @Column({ type: 'int', nullable: true })
  imapPort: number;

  @Column({ default: true })
  imapSecure: boolean;

  // SMTP settings
  @Column({ nullable: true })
  smtpHost: string;

  @Column({ type: 'int', nullable: true })
  smtpPort: number;

  @Column({ default: true })
  smtpSecure: boolean;

  // OAuth tokens (encrypted)
  @Column('text', { nullable: true })
  accessToken: string;

  @Column('text', { nullable: true })
  refreshToken: string;

  /** The provider's id for this mailbox's account */
  @Column('text', { nullable: true })
  oauthProviderId: string;

  @Column('text', { nullable: true })
  encryptedPassword: string;

  @Column({ default: false })
  connected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
