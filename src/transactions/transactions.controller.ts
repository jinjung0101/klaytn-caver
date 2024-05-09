import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const transaction =
        await this.transactionsService.createTransaction(createTransactionDto);
      return transaction;
    } catch (error) {
      throw new BadRequestException('전송 실패: ' + error.message);
    }
  }

  @Post('/sendToSpending')
  async sendToSpending(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const transactionResult =
        await this.transactionsService.transferToSpending(createTransactionDto);
      return transactionResult;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('/sendToWallet')
  async sendToWallet(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const transactionResult =
        await this.transactionsService.transferToWallet(createTransactionDto);
      return transactionResult;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
