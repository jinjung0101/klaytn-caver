import { Transaction } from '../entities/transaction.entity';

export class CreateCoinLogDto {
  userId: number;
  transaction: Transaction;
  amountChanged: number;
}
