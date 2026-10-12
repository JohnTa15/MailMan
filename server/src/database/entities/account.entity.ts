import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ default: 'imap' })
  type: 'imap' | 'ews' | 'gmail' | 'outlook';

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

  @Column('text', { nullable: true })
  encryptedPassword: string;

  @Column({ default: false })
  connected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
