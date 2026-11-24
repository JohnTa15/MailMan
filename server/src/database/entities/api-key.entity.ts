import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** What an AI key may do. Sending mail is deliberately not one of them. */
export type ApiKeyScope = 'read' | 'organize' | 'drafts';
export const API_KEY_SCOPES: ApiKeyScope[] = ['read', 'organize', 'drafts'];

/** A key that lets an AI assistant reach one user's mail over MCP. */
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  name: string;

  /** The start of the key, to recognise it in the list */
  @Column()
  prefix: string;

  /** SHA-256 of the key; the key itself is shown once and never stored */
  @Index({ unique: true })
  @Column()
  keyHash: string;

  @Column('simple-array')
  scopes: ApiKeyScope[];

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
