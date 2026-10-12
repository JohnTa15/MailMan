import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Email } from './email.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  emailId: string;

  @Column()
  name: string;

  @Column('bigint')
  size: number;

  @Column()
  mimeType: string;

  @Column('text', { nullable: true })
  data: string; // Base64 encoded

  @Column({ nullable: true })
  contentId: string; // For inline attachments

  @ManyToOne(() => Email, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emailId' })
  email: Email;
}
