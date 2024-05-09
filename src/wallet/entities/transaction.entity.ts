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

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column({ unique: true })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: ['Submitted', 'Committed', 'CommitError'],
  })
  status: 'Submitted' | 'Committed' | 'CommitError';

  @CreateDateColumn()
  createdAt: Date;
}
