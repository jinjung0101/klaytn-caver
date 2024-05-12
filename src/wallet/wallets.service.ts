import {
  Injectable,
  BadRequestException,
  // NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WalletsRepository } from './wallets.repository';
import { Transaction } from './entities/transaction.entity';
import { CoinLog } from './entities/coin-log.entity';
import { MockCaver } from 'src/utils/mocking-caver.utils';

@Injectable()
export class WalletsService {
  constructor(private readonly walletsRepository: WalletsRepository) {}

  public async handleBlockchainTransaction(
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const { status, transactionHash } = await MockCaver.transferKlay(
      dto.fromAddress,
      dto.toAddress,
      dto.amount,
    );
    if (status === 'Committed') {
      return this.walletsRepository.createAndSaveTransaction({
        ...dto,
        status,
        transactionHash,
      });
    } else {
      throw new Error(`거래 실패: ${status}`);
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
