import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity({ name: 'coin-logs' })
@Index(['userId'])
export class CoinLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => Transaction, (transaction) => transaction.id)
  transaction: Transaction;

  @Column('decimal', { precision: 18, scale: 8 })
  amountChanged: number;

  @CreateDateColumn()
  createdAt: Date;
}
