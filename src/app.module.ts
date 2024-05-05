import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { SpendingModule } from './spending/spending.module';

@Module({
  imports: [UsersModule, WalletModule, SpendingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
