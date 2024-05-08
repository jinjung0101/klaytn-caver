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
      throw new BadRequestException(error.message);
    }
  }

  @Post('/sendToSpending')
  async sendToSpending(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      // 여기서는 createTransaction 메소드를 재활용하여 거래를 생성하고 처리합니다.
      // 실제 환경에서는 caver.transferKlay를 모킹한 로직을 추가하여 Klay 전송 처리를 모방할 수 있습니다.
      const transaction = await this.transactionsService.createTransaction({
        ...createTransactionDto,
        // 여기에 필요한 추가 로직을 포함합니다.
      });
      return transaction;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // '지갑으로' API도 유사하게 구현할 수 있습니다.
}
