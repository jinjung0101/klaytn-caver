import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
