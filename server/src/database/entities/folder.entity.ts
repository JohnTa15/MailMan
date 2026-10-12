import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @Column()
  name: string;

  @Column({ default: 'custom' })
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'draft' | 'spam' | 'custom';

  @Column({ nullable: true })
  color: string;

  @Column({ default: 0 })
  count: number;

  @Column({ nullable: true })
  parentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;
}
