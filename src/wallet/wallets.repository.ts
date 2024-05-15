import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
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
      console.error('createAndSaveTransaction 오류 발생:', error);
      throw new InternalServerErrorException('트랜잭션 저장 중 오류 발생');
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
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { transactionHash },
      });
      if (!transaction) {
        console.error('존재하지 않는 거래입니다', transactionHash);
        return null;
      }
      return transaction;
    } catch (error) {
      console.error('findTransactionByHash 오류 발생:', error);
      throw new InternalServerErrorException('트랜잭션 조회 중 오류 발생');
    }
  }

  private async updateAccountBalances(
    queryRunner: QueryRunner,
    userId: number,
    amount: number,
    transaction: Transaction,
  ): Promise<void> {
    try {
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
    } catch (error) {
      console.error('updateAccountBalances 오류 발생:', error);
      throw new InternalServerErrorException('계정 잔액 업데이트 중 오류 발생');
    }
  }

  private async updateCoinBalance(
    transactionalEntityManager: EntityManager,
    userId: number,
    amount: number,
  ): Promise<void> {
    try {
      const coin = await transactionalEntityManager.findOne(Coin, {
        where: { userId },
        lock: { mode: 'pessimistic_write' }, // 락을 걸어 동시성 문제 해결
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
    } catch (error) {
      console.error('updateCoinBalance 오류 발생:', error);
      throw new InternalServerErrorException('코인 잔액 업데이트 중 오류 발생');
    }
  }

  private async createCoinLog(
    transactionalEntityManager: EntityManager,
    userId: number,
    transaction: Transaction,
    amountChanged: number,
  ): Promise<void> {
    try {
      const coinLog = transactionalEntityManager.create(CoinLog, {
        userId,
        transaction,
        amountChanged,
      });
      await transactionalEntityManager.save(coinLog);
    } catch (error) {
      console.error('createCoinLog 오류 발생:', error);
      throw new InternalServerErrorException('코인 로그 생성 중 오류 발생');
    }
  }

  async getBalance(userId: number): Promise<number> {
    try {
      const coinRecord = await this.coinRepository.findOne({
        where: { userId },
      });
      if (!coinRecord)
        throw new NotFoundException('사용자가 존재하지 않습니다.');
      return coinRecord.balance;
    } catch (error) {
      console.error('getBalance 오류 발생:', error);
      throw new InternalServerErrorException('잔액 조회 중 오류 발생');
    }
  }

  async findCoinLogsByUserId(userId: number): Promise<CoinLog[]> {
    try {
      return await this.coinLogRepository.find({
        where: { userId: userId },
      });
    } catch (error) {
      console.error('findCoinLogsByUserId 오류 발생:', error);
      throw new InternalServerErrorException('코인 로그 조회 중 오류 발생');
    }
  }
}
