import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coin } from './entities/coin.entity';
import { CoinLog } from './entities/coin-log.entity';
import { Transaction } from './entities/transaction.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';
import { KafkaModule } from 'src/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coin, CoinLog, Transaction]),
    forwardRef(() => KafkaModule),
  ],
  controllers: [WalletsController],
  providers: [WalletsService, WalletsRepository],
  exports: [WalletsService],
})
export class WalletsModule {}
