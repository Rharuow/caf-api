import { Test, TestingModule } from '@nestjs/testing';
import { ResidentVisitantService } from './visitant.service';

describe('VisitantService', () => {
  let service: ResidentVisitantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResidentVisitantService],
    }).compile();

    service = module.get<ResidentVisitantService>(ResidentVisitantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
