import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository, DataSource, EntityManager } from 'typeorm';
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
    await queryRunner.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        await this.updateCoinBalance(
          transactionalEntityManager,
          userId,
          amount,
        );
        await this.createCoinLog(
          transactionalEntityManager,
          userId,
          transaction,
          amount,
        );
      },
    );
  }

  private async updateCoinBalance(
    transactionalEntityManager: EntityManager,
    userId: number,
    amount: number,
  ): Promise<void> {
    const coin = await transactionalEntityManager.findOne(Coin, {
      where: { userId },
    });
    if (!coin) {
      throw new NotFoundException(
        `사용자의 코인 잔액 정보를 찾을 수 없습니다. userId: ${userId}`,
      );
    }

    const updatedBalance = coin.balance + amount;
    if (updatedBalance < 0) {
      throw new Error('잔액 부족: 잔액은 음수가 될 수 없습니다.');
    }

    coin.balance = updatedBalance;
    await transactionalEntityManager.save(coin);
  }

  private async createCoinLog(
    transactionalEntityManager: EntityManager,
    userId: number,
    transaction: Transaction,
    amountChanged: number,
  ): Promise<void> {
    const coinLog = transactionalEntityManager.create(CoinLog, {
      userId,
      transaction,
      amountChanged,
    });
    await transactionalEntityManager.save(coinLog);
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
