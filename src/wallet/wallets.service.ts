import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { KafkaService } from 'src/kafka/kafka.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateCoinLogDto } from './dto/create-coin-log.dto';
import { WalletsRepository } from './wallets.repository';
import { MockCaver } from 'src/utils/mocking-caver.utils';

@Injectable()
export class WalletsService {
  constructor(
    private walletsRepository: WalletsRepository,
    private kafkaService: KafkaService,
  ) {}

  async transferToSpending(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    return this.checkAndHandleTransaction(dto);
  }

  async transferToWallet(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    return this.checkAndHandleTransaction(dto);
  }

  private async checkAndHandleTransaction(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    const userBalance = await this.walletsRepository.getBalance(dto.userId);
    if (userBalance < dto.amount) {
      throw new BadRequestException('잔액 부족: 충분한 Klay가 없습니다.');
    }
    return this.handleBlockchainTransaction(dto);
  }

  async handleBlockchainTransaction(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    const { status, transactionHash } = await this.mockCaverTransaction(dto);

    await this.walletsRepository.createAndSaveTransaction({
      ...dto,
      status,
      transactionHash,
    });

    if (status === 'Submitted') {
      // 이벤트 발행하여 트랜잭션 모니터링 시작
      await this.kafkaService.sendMessage('transaction-status', {
        transactionHash,
        status,
        dto,
      });
    } else if (status === 'Committed') {
      await this.transactionCompletion({ ...dto, status, transactionHash });
    } else if (status === 'CommitError') {
      await this.transactionError(status, transactionHash);
    }

    return { ...dto, status, transactionHash };
  }

  async mockCaverTransaction(dto: CreateTransactionDto): Promise<{
    status: 'Submitted' | 'Committed' | 'CommitError';
    transactionHash: string;
  }> {
    return await MockCaver.transferKlay(
      dto.fromAddress,
      dto.toAddress,
      dto.amount,
    );
  }

  async transactionCompletion(dto: CreateTransactionDto) {
    const transaction = await this.walletsRepository.findTransactionByHash(
      dto.transactionHash,
    );
    if (!transaction) {
      throw new NotFoundException(
        `존재하지 않는 거래입니다. ${dto.transactionHash}`,
      );
    }
    transaction.status = 'Committed';
    return this.walletsRepository.updateTransaction(transaction);
  }

  // 재시도 로직 추가할 예정
  async transactionError(
    status: 'Submitted' | 'Committed' | 'CommitError',
    transactionHash: string,
  ) {
    throw new BadRequestException(
      `거래 실패했습니다. 거래 상태:${status}. 거래 Hash:${transactionHash}`,
    );
  }

  async getUserCoinLogs(userId: number): Promise<CreateCoinLogDto[]> {
    return this.walletsRepository.findCoinLogsByUserId(userId);
  }
}
