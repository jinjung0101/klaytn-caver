import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity({ name: 'coin-logs' })
@Index(['userId'])
export class CoinLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @OneToOne(() => Transaction)
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;

  @Column('decimal', { precision: 18, scale: 8 })
  amountChanged: number;

  @CreateDateColumn()
  createdAt: Date;
}
