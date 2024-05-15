import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
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

  async checkAndHandleTransaction(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    try {
      const userBalance = await this.walletsRepository.getBalance(dto.userId);
      if (userBalance < dto.amount) {
        throw new BadRequestException('잔액 부족: 충분한 Klay가 없습니다.');
      }
      return await this.handleBlockchainTransaction(dto);
    } catch (error) {
      console.error('checkAndHandleTransaction 오류 발생:', error);
      throw new InternalServerErrorException(
        '블록체인 거래 확인 작업 중 오류가 발생하였습니다.',
      );
    }
  }

  async handleBlockchainTransaction(
    dto: CreateTransactionDto,
  ): Promise<CreateTransactionDto> {
    try {
      const { status, transactionHash } = await this.mockCaverTransaction(dto);

      if (status === 'Committed') {
        await this.transactionCompletion({
          ...dto,
          status,
          transactionHash,
        });
      } else if (status === 'Submitted') {
        await this.kafkaService.sendMessage('transaction-status', {
          transactionHash,
          status,
          dto,
          retryCount: 0,
        });
      } else if (status === 'CommitError') {
        await this.transactionError(status, transactionHash);
      }

      return { ...dto, status, transactionHash };
    } catch (error) {
      console.error('handleBlockchainTransaction 오류 발생:', error);
      throw new InternalServerErrorException(
        '블록체인 거래 처리 중 오류가 발생하였습니다.',
      );
    }
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
    try {
      const existingTransaction =
        await this.walletsRepository.findTransactionByHash(dto.transactionHash);
      if (existingTransaction) {
        throw new BadRequestException(
          `이미 처리된 거래입니다. ${dto.transactionHash}`,
        );
      }

      await this.walletsRepository.createAndSaveTransaction(dto);
    } catch (error) {
      console.error('transactionCompletion 오류 발생:', error);
      throw new InternalServerErrorException(
        '블록체인 거래 처리 중 오류가 발생하였습니다.',
      );
    }
  }
  async transactionError(
    status: 'Submitted' | 'Committed' | 'CommitError',
    transactionHash: string,
  ) {
    try {
      console.error(`트랜잭션 오류: 상태=${status}, 해시=${transactionHash}`);
      await this.handlePostTransactionError(status, transactionHash);
    } catch (error) {
      throw new BadRequestException(
        `거래 실패했습니다. 거래 상태:${status}. 거래 Hash:${transactionHash}`,
      );
    }
  }

  async handlePostTransactionError(
    status: 'Submitted' | 'Committed' | 'CommitError',
    transactionHash: string,
  ) {
    console.log(`트랜잭션 오류 후속 작업: ${transactionHash}`);
    // 실패 알림 전송
  }

  async getUserCoinLogs(userId: number): Promise<CreateCoinLogDto[]> {
    try {
      return await this.walletsRepository.findCoinLogsByUserId(userId);
    } catch (error) {
      console.error('getUserCoinLogs 오류 발생:', error);
      throw new InternalServerErrorException(
        '코인 로그 조회 중 오류가 발생하였습니다.',
      );
    }
  }
}
