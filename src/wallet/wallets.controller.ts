import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('/sendToSpending')
  async sendToSpending(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const transactionResult =
        await this.walletsService.transferToSpending(createTransactionDto);
      return transactionResult;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('/sendToWallet')
  async sendToWallet(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      const transactionResult =
        await this.walletsService.transferToWallet(createTransactionDto);
      return transactionResult;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('/coin-log/:userId')
  async getUserCoinLogs(@Param('userId') userId: number) {
    try {
      return await this.walletsService.getUserCoinLogs(userId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
