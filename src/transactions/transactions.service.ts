import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionsRepository)
    private transactionsRepository: TransactionsRepository,
  ) {}

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsRepository.createAndSaveTransaction(
      createTransactionDto,
    );
  }

  async mockBlockchainTransaction(
    dto: CreateTransactionDto,
  ): Promise<{ status: string; transactionHash: string }> {
    // 네트워크 지연 및 트랜잭션 결과 시뮬레이션
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: 'Committed', transactionHash: '0x...' });
      }, 1000); // 1초 지연
    });
  }

  async transferToSpending(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const blockchainResponse =
      await this.mockBlockchainTransaction(createTransactionDto);
    if (blockchainResponse.status === 'Committed') {
      return this.transactionsRepository.createAndSaveTransaction(
        createTransactionDto,
      );
    } else {
      throw new Error('spending 거래 실패: ' + blockchainResponse.status);
    }
  }

  async transferToWallet(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const blockchainResponse =
      await this.mockBlockchainTransaction(createTransactionDto);
    if (blockchainResponse.status === 'Committed') {
      return this.transactionsRepository.createAndSaveTransaction(
        createTransactionDto,
      );
    } else {
      throw new Error('wallet 거래 실패: ' + blockchainResponse.status);
    }
  }
}
