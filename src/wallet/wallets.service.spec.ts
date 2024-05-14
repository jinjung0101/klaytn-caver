import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';
import { KafkaService } from 'src/kafka/kafka.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { BadRequestException } from '@nestjs/common';

jest.mock('src/kafka/kafka.service');

describe('WalletsService', () => {
  let service: WalletsService;
  let repository: WalletsRepository;
  let kafkaService: KafkaService;
  let dto: CreateTransactionDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: WalletsRepository,
          useValue: {
            getBalance: jest.fn(),
            findTransactionByHash: jest.fn(),
            createAndSaveTransaction: jest.fn(),
            findCoinLogsByUserId: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    repository = module.get<WalletsRepository>(WalletsRepository);
    kafkaService = module.get<KafkaService>(KafkaService);

    dto = {
      fromAddress: 'from',
      toAddress: 'to',
      amount: 100,
      userId: 1,
      status: 'Submitted',
      transactionHash: 'hash',
    };
  });

  describe('transferToSpending', () => {
    it('올바른 DTO와 함께 checkAndHandleTransaction을 호출해야 합니다', async () => {
      const result = { ...dto, status: 'Committed' } as const;
      jest
        .spyOn(service, 'checkAndHandleTransaction')
        .mockResolvedValue(result);

      expect(await service.transferToSpending(dto)).toBe(result);
      expect(service.checkAndHandleTransaction).toHaveBeenCalledWith(dto);
    });
  });

  describe('checkAndHandleTransaction', () => {
    it('잔액이 부족하면 BadRequestException을 던져야 합니다', async () => {
      jest.spyOn(repository, 'getBalance').mockResolvedValue(50);

      await expect(service.checkAndHandleTransaction(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('잔액이 충분하면 handleBlockchainTransaction을 호출해야 합니다', async () => {
      const result = { ...dto, status: 'Committed' } as const;
      jest.spyOn(repository, 'getBalance').mockResolvedValue(150);
      jest
        .spyOn(service, 'handleBlockchainTransaction')
        .mockResolvedValue(result);

      expect(await service.checkAndHandleTransaction(dto)).toBe(result);
      expect(service.handleBlockchainTransaction).toHaveBeenCalledWith(dto);
    });
  });

  describe('handleBlockchainTransaction', () => {
    const mockResponses = {
      Committed: { status: 'Committed', transactionHash: 'hash' } as const,
      Submitted: { status: 'Submitted', transactionHash: 'hash' } as const,
      CommitError: { status: 'CommitError', transactionHash: 'hash' } as const,
    };

    it('Committed 상태의 트랜잭션을 올바르게 처리해야 합니다', async () => {
      jest
        .spyOn(service, 'mockCaverTransaction')
        .mockResolvedValue(mockResponses.Committed);
      jest.spyOn(service, 'transactionCompletion').mockResolvedValue(undefined);

      await service.handleBlockchainTransaction(dto);
      expect(service.transactionCompletion).toHaveBeenCalledWith({
        ...dto,
        status: 'Committed',
        transactionHash: 'hash',
      });
    });

    it('Submitted 상태의 트랜잭션을 올바르게 처리해야 합니다', async () => {
      jest
        .spyOn(service, 'mockCaverTransaction')
        .mockResolvedValue(mockResponses.Submitted);

      await service.handleBlockchainTransaction(dto);
      expect(kafkaService.sendMessage).toHaveBeenCalledWith(
        'transaction-status',
        {
          transactionHash: 'hash',
          status: 'Submitted',
          dto,
          retryCount: 0,
        },
      );
    });

    it('CommitError 상태의 트랜잭션을 올바르게 처리해야 합니다', async () => {
      jest
        .spyOn(service, 'mockCaverTransaction')
        .mockResolvedValue(mockResponses.CommitError);
      jest.spyOn(service, 'transactionError').mockResolvedValue(undefined);

      await service.handleBlockchainTransaction(dto);
      expect(service.transactionError).toHaveBeenCalledWith(
        'CommitError',
        'hash',
      );
    });
  });

  describe('transactionCompletion', () => {
    it('이미 존재하는 트랜잭션이면 BadRequestException을 던져야 합니다', async () => {
      jest
        .spyOn(repository, 'findTransactionByHash')
        .mockResolvedValue(dto as any);

      await expect(service.transactionCompletion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('트랜잭션이 존재하지 않으면 createAndSaveTransaction을 호출해야 합니다', async () => {
      jest.spyOn(repository, 'findTransactionByHash').mockResolvedValue(null);
      jest.spyOn(repository, 'createAndSaveTransaction').mockResolvedValue({
        ...dto,
        id: 1,
        createdAt: new Date(),
      } as any);

      await service.transactionCompletion(dto);
      expect(repository.createAndSaveTransaction).toHaveBeenCalledWith(dto);
    });
  });
});
