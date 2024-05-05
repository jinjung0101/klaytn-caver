import { Test, TestingModule } from '@nestjs/testing';
import { SpendingService } from './spending.service';

describe('SpendingService', () => {
  let service: SpendingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpendingService],
    }).compile();

    service = module.get<SpendingService>(SpendingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
