import { QueryRunner, Repository, Connection } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CoinLog } from './entities/coin-log.entity';
import { Coin } from './entities/coin.entity';
import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectRepository(CoinLog)
    private coinLogRepository: Repository<CoinLog>,
    @InjectRepository(Coin)
    private coinRepository: Repository<Coin>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectConnection()
    private connection: Connection,
  ) {}

  async createAndSaveTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const transaction = await this.createTransaction(
        queryRunner,
        createTransactionDto,
      );
      await this.updateAccountBalances(
        queryRunner,
        createTransactionDto.userId,
        createTransactionDto.amount,
        transaction,
      );
      await queryRunner.commitTransaction();
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createTransaction(
    queryRunner: QueryRunner,
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const transaction = queryRunner.manager.create(
      Transaction,
      createTransactionDto,
    );
    return await queryRunner.manager.save(transaction);
  }

  private async updateAccountBalances(
    queryRunner: QueryRunner,
    userId: number,
    amount: number,
    transaction: Transaction,
  ): Promise<void> {
    await this.updateCoinBalance(queryRunner, userId, amount);
    await this.createCoinLog(queryRunner, userId, transaction, amount);
  }

  private async updateCoinBalance(
    queryRunner: QueryRunner,
    userId: number,
    amount: number,
  ): Promise<void> {
    let coin = await this.coinRepository.findOne({ where: { userId } });
    if (!coin) {
      coin = this.coinRepository.create({ userId, balance: 0 });
    }
    coin.balance += amount;
    await queryRunner.manager.save(coin);
  }

  private async createCoinLog(
    queryRunner: QueryRunner,
    userId: number,
    transaction: Transaction,
    amountChanged: number,
  ): Promise<void> {
    const coinLog = this.coinLogRepository.create({
      userId,
      transaction,
      amountChanged,
    });
    await queryRunner.manager.save(coinLog);
  }
}
