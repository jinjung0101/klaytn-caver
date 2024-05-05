import { Test, TestingModule } from '@nestjs/testing';
import { SpendingController } from './spending.controller';
import { SpendingService } from './spending.service';

describe('SpendingController', () => {
  let controller: SpendingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpendingController],
      providers: [SpendingService],
    }).compile();

    controller = module.get<SpendingController>(SpendingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
