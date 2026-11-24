import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A one-time code an admin hands out so someone can create a user. */
@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  createdById: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  usedById: string | null;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
