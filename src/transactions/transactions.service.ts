import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionsRepository)
    private transactionsRepository: TransactionsRepository,
    private connection: Connection,
  ) {}

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    const queryRunner = this.connection.createQueryRunner();
    await this.startTransaction(queryRunner);

    try {
      const mockResult = this.processMockResult(); // Mock 결과 처리 분리

      const savedTransaction =
        await this.transactionsRepository.createAndSaveTransaction({
          ...createTransactionDto,
          status: mockResult.status,
          transactionHash: mockResult.transactionHash,
        });

      await this.handleTransactionResult(
        createTransactionDto,
        savedTransaction,
        mockResult,
      );

      await this.commitTransaction(queryRunner);
      return savedTransaction;
    } catch (error) {
      await this.rollbackTransaction(queryRunner);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async startTransaction(queryRunner) {
    await queryRunner.connect();
    await queryRunner.startTransaction();
  }

  private async commitTransaction(queryRunner) {
    await queryRunner.commitTransaction();
  }

  private async rollbackTransaction(queryRunner) {
    await queryRunner.rollbackTransaction();
  }

  private processMockResult(): {
    status: 'Committed' | 'Submitted' | 'CommitError';
    transactionHash: string;
  } {
    return {
      status: 'Committed', // "Submitted" 또는 "CommitError"로 변경 가능
      transactionHash: '0x123...',
    };
  }

  private async handleTransactionResult(
    createTransactionDto: CreateTransactionDto,
    savedTransaction: Transaction,
    mockResult,
  ) {
    if (mockResult.status === 'Committed') {
      await this.updateCoinLog(
        createTransactionDto.userId,
        savedTransaction,
        createTransactionDto.amount,
      );
      await this.updateCoinBalance(
        createTransactionDto.userId,
        createTransactionDto.amount,
      );
    }
  }

  private async updateCoinLog(
    userId: number,
    transaction: Transaction,
    amount: number,
  ) {
    await this.transactionsRepository.createAndSaveCoinLog({
      userId,
      transaction,
      amountChanged: amount,
    });
  }

  private async updateCoinBalance(userId: number, amount: number) {
    await this.transactionsRepository.findAndUpdateCoin(userId, amount);
  }
}
