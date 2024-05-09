import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction } from './entities/transaction.entity';

describe('WalletsService', () => {
  let service: WalletsService;
  let repository;

  const mockTransactionsRepository = () => ({
    getBalance: jest.fn(),
    createAndSaveTransaction: jest.fn().mockResolvedValue(new Transaction()),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: WalletsRepository,
          useFactory: mockTransactionsRepository,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    repository = module.get<WalletsRepository>(WalletsRepository);
  });

  describe('transferToSpending', () => {
    it('잔액이 부족할 경우 BadRequestException 예외를 발생시킨다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 100;
      repository.getBalance.mockResolvedValue(50); // 부족한 잔액

      await expect(service.transferToSpending(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('잔액이 충분하고 블록체인 트랜잭션이 성공하면 트랜잭션을 저장한다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 50;
      repository.getBalance.mockResolvedValue(100); // 충분한 잔액
      jest
        .spyOn(service, 'mockBlockchainTransaction')
        .mockResolvedValue({ status: 'Committed', transactionHash: '0x...' });

      await expect(service.transferToSpending(dto)).resolves.toBeInstanceOf(
        Transaction,
      );
      expect(repository.createAndSaveTransaction).toHaveBeenCalled();
    });

    it('블록체인 트랜잭션이 실패하면 NotFoundException을 발생시킨다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 50;
      repository.getBalance.mockResolvedValue(100);
      jest
        .spyOn(service, 'mockBlockchainTransaction')
        .mockResolvedValue({ status: 'CommitError', transactionHash: '0x...' });

      await expect(service.transferToSpending(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transferToWallet', () => {
    it('잔액이 부족할 경우 BadRequestException 예외를 발생시킨다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 100;
      repository.getBalance.mockResolvedValue(50); // 부족한 잔액

      await expect(service.transferToWallet(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('잔액이 충분하고 블록체인 트랜잭션이 성공하면 트랜잭션을 저장한다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 50;
      repository.getBalance.mockResolvedValue(100); // 충분한 잔액
      jest
        .spyOn(service, 'mockBlockchainTransaction')
        .mockResolvedValue({ status: 'Committed', transactionHash: '0x...' });

      await expect(service.transferToWallet(dto)).resolves.toBeInstanceOf(
        Transaction,
      );
      expect(repository.createAndSaveTransaction).toHaveBeenCalled();
    });

    it('블록체인 트랜잭션이 실패하면 NotFoundException을 발생시킨다', async () => {
      const dto = new CreateTransactionDto();
      dto.userId = 1;
      dto.amount = 50;
      repository.getBalance.mockResolvedValue(100);
      jest
        .spyOn(service, 'mockBlockchainTransaction')
        .mockResolvedValue({ status: 'CommitError', transactionHash: '0x...' });

      await expect(service.transferToWallet(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
