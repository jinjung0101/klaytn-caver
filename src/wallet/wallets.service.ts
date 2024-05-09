import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WalletsRepository } from './wallets.repository';
import { Transaction } from './entities/transaction.entity';
import { CoinLog } from './entities/coin-log.entity';

@Injectable()
export class WalletsService {
  constructor(private readonly walletsRepository: WalletsRepository) {}

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

  private async handleBlockchainTransaction(
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const blockchainResponse = await this.mockBlockchainTransaction(dto);
    if (blockchainResponse.status === 'Committed') {
      return this.walletsRepository.createAndSaveTransaction(dto);
    } else {
      throw new NotFoundException(`거래 실패: ${blockchainResponse.status}`);
    }
  }

  private async checkAndHandleTransaction(
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const userBalance = await this.walletsRepository.getBalance(dto.userId);
    if (userBalance < dto.amount) {
      throw new BadRequestException('잔액 부족: 충분한 Klay가 없습니다.');
    }
    return this.handleBlockchainTransaction(dto);
  }

  async transferToSpending(dto: CreateTransactionDto): Promise<Transaction> {
    return this.checkAndHandleTransaction(dto);
  }

  async transferToWallet(dto: CreateTransactionDto): Promise<Transaction> {
    return this.checkAndHandleTransaction(dto);
  }

  async getUserCoinLogs(userId: number): Promise<CoinLog[]> {
    return this.walletsRepository.findCoinLogsByUserId(userId);
  }
}
