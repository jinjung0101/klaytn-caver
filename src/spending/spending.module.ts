import { Module } from '@nestjs/common';
import { SpendingService } from './spending.service';
import { SpendingController } from './spending.controller';

@Module({
  controllers: [SpendingController],
  providers: [SpendingService],
})
export class SpendingModule {}
