import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 42 })
  fromAddress: string;

  @Column({ type: 'char', length: 42 })
  toAddress: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'char', length: 66, unique: true })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: ['Submitted', 'Committed', 'CommitError'],
  })
  status: 'Submitted' | 'Committed' | 'CommitError';

  @CreateDateColumn()
  createdAt: Date;
}
