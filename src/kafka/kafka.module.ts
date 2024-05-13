import { Module, forwardRef } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { ConfigModule } from '@nestjs/config';
import { WalletsModule } from 'src/wallet/wallets.module';

@Module({
  imports: [ConfigModule, forwardRef(() => WalletsModule)],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
