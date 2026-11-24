import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** A person who signs in to Mailman; owns any number of mailboxes. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  displayName: string | null;

  /** scrypt hash; empty for people who only use Google/Microsoft sign-in */
  @Column({ type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'text', default: 'user' })
  role: 'admin' | 'user';

  /** Stable provider account ids used for "Continue with Google/Microsoft" */
  @Column({ type: 'text', nullable: true, unique: true })
  googleSub: string | null;

  @Column({ type: 'text', nullable: true, unique: true })
  microsoftSub: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
