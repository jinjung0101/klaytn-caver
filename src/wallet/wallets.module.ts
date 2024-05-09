import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coin } from './entities/coin.entity';
import { CoinLog } from './entities/coin-log.entity';
import { Transaction } from './entities/transaction.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Coin, CoinLog, Transaction])],
  controllers: [WalletsController],
  providers: [WalletsService, WalletsRepository],
})
export class WalletsModule {}
