import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CoinLog } from './entities/coin-log.entity';
import { Coin } from './entities/coin.entity';
import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateCoinLogDto } from './dto/create-coin-log.dto';

@Injectable()
export class TransactionsRepository extends Repository<Transaction> {
  async createAndSaveTransaction(
    transactionData: CreateTransactionDto,
  ): Promise<Transaction> {
    const transaction = this.create(transactionData);
    return await this.save(transaction);
  }

  async createAndSaveCoinLog(coinLogData: CreateCoinLogDto): Promise<CoinLog> {
    const coinLog = this.manager.create(CoinLog, coinLogData);
    return await this.manager.save(coinLog);
  }

  async findAndUpdateCoin(userId: number, amount: number): Promise<Coin> {
    let coin = await this.manager.findOne(Coin, { where: { userId: userId } });
    if (!coin) {
      coin = this.manager.create(Coin, {
        userId: userId,
        balance: 0,
      });
    }
    coin.balance = Number(coin.balance) + amount; // `balance`가 decimal이므로, 적절한 타입 변환을 고려해야 합니다.
    return await this.manager.save(coin);
  }
}
