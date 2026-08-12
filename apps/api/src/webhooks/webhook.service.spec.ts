import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma.service';
import { HttpService } from '@nestjs/axios';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockPrisma = {
    webhookSubscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    webhookLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return webhooks for tenant', async () => {
      const webhooks = [{ id: '1', url: 'https://example.com/hook', events: ['campaign.completed'] }];
      mockPrisma.webhookSubscription.findMany.mockResolvedValue(webhooks);
      const result = await service.findAll('tenant1');
      expect(result).toEqual(webhooks);
    });
  });
});
