import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** One thing an AI key did, so the user can see what their assistant touched. */
@Entity('ai_activity')
@Index(['userId', 'createdAt'])
export class AiActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'text', nullable: true })
  keyId: string | null;

  @Column()
  keyName: string;

  @Column()
  tool: string;

  /** What it did, without message contents */
  @Column('text')
  summary: string;

  @Column({ default: true })
  ok: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
