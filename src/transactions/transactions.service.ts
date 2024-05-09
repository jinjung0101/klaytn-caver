import { Injectable, BadRequestException } from '@nestjs/common';
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
    // 잔액 확인
    const userBalance = await this.transactionsRepository.getBalance(
      createTransactionDto.userId,
    );
    if (userBalance < createTransactionDto.amount) {
      throw new BadRequestException('잔액 부족: 충분한 Klay가 없습니다.');
    }

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
    // 잔액 확인
    const userBalance = await this.transactionsRepository.getBalance(
      createTransactionDto.userId,
    );
    if (userBalance < createTransactionDto.amount) {
      throw new BadRequestException('잔액 부족: 충분한 Klay가 없습니다.');
    }

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
