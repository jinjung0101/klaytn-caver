import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository, DataSource } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CoinLog } from './entities/coin-log.entity';
import { Coin } from './entities/coin.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class WalletsRepository {
  constructor(
    @InjectRepository(CoinLog)
    private coinLogRepository: Repository<CoinLog>,
    @InjectRepository(Coin)
    private coinRepository: Repository<Coin>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async createAndSaveTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const transaction = await this.createTransaction(createTransactionDto);
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

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...dto,
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async findTransactionByHash(
    transactionHash: string,
  ): Promise<Transaction | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionHash },
    });
    if (!transaction) {
      console.error('존재하지 않는 거래입니다', transactionHash);
      return null;
    }
    return transaction;
  }

  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    return this.transactionRepository.save(transaction);
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

  async getBalance(userId: number): Promise<number> {
    const coinRecord = await this.coinRepository.findOne({ where: { userId } });
    if (!coinRecord) throw new NotFoundException('사용자가 존재하지 않습니다.');
    return coinRecord.balance;
  }

  async findCoinLogsByUserId(userId: number): Promise<CoinLog[]> {
    return this.coinLogRepository.find({
      where: { userId: userId },
    });
  }
}
