import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NinetyNineService } from './ninety-nine.service';
import { DeliveryStatus } from '@prisma/client';

describe('NinetyNineService', () => {
  let service: NinetyNineService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NinetyNineService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NinetyNineService>(NinetyNineService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Authentication', () => {
    it('should throw ServiceUnavailableException when credentials are not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        service.quoteDelivery({
          pickup: { address: {} },
          dropoff: { address: {} },
          items: [],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should obtain access token successfully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      const token = await service['getAccessToken']();
      expect(token).toBe('test-access-token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.99minutos.com/api/v3/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
          }),
        }),
      );
    });

    it('should cache access token and reuse until expiry', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      const token1 = await service['getAccessToken']();
      const token2 = await service['getAccessToken']();

      expect(token1).toBe('test-access-token');
      expect(token2).toBe('test-access-token');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh token when expired', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 1,
          token_type: 'bearer',
        }),
      });

      await service['getAccessToken']();

      // Manually expire token
      service['tokenCache'] = {
        token: 'test-access-token',
        expiresAt: new Date(Date.now() - 1000),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      const newToken = await service['getAccessToken']();
      expect(newToken).toBe('new-access-token');
    });
  });

  describe('Quote Delivery', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });
    });

    it('should throw error when pickup address is missing', async () => {
      await expect(
        service.quoteDelivery({
          pickup: { address: null },
          dropoff: { address: {} },
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when dropoff address is missing', async () => {
      await expect(
        service.quoteDelivery({
          pickup: { address: {} },
          dropoff: { address: null },
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when coordinates are missing', async () => {
      await expect(
        service.quoteDelivery({
          pickup: { address: { lat: null, lng: null } },
          dropoff: { address: { lat: null, lng: null } },
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when items are missing', async () => {
      await expect(
        service.quoteDelivery({
          pickup: { address: { lat: -23.5505, lng: -46.6333 } },
          dropoff: { address: { lat: -23.551, lng: -46.634 } },
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when items lack dimensions', async () => {
      await expect(
        service.quoteDelivery({
          pickup: { address: { lat: -23.5505, lng: -46.6333 } },
          dropoff: { address: { lat: -23.551, lng: -46.634 } },
          items: [
            {
              description: 'Test',
              weight: 0,
              length: 0,
              width: 0,
              height: 0,
              quantity: 1,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should obtain quote successfully with real data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            totalCost: 25.5,
            serviceLevels: ['SPT', 'SMD'],
          },
        }),
      });

      const result = await service.quoteDelivery({
        pickup: {
          address: {
            recipient: 'Loja Teste',
            phone: '+5511999999999',
            email: 'loja@teste.com',
            zipcode: '01310-100',
            street: 'Rua Teste',
            number: '123',
            complement: 'Apto 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
        },
        dropoff: {
          address: {
            recipient: 'Cliente Teste',
            phone: '+5511888888888',
            email: 'cliente@teste.com',
            zipcode: '01310-200',
            street: 'Av Teste',
            number: '456',
            complement: null,
            district: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            reference: 'Próximo ao mercado',
            lat: -23.551,
            lng: -46.634,
          },
        },
        items: [
          {
            description: 'Produto Teste',
            weight: 500,
            length: 20,
            width: 15,
            height: 10,
            quantity: 2,
          },
        ],
      });

      expect(result.shippingCost).toBe(25.5);
      expect(result.quoteId).toBeNull(); // API does not provide quote ID
      expect(result.expiresAt).toBeNull(); // API does not provide expiration
    });

    it('should throw error when API does not return valid shipping cost', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}), // Missing totalCost
      });

      await expect(
        service.quoteDelivery({
          pickup: {
            address: {
              recipient: 'Loja Teste',
              phone: '+5511999999999',
              email: 'loja@teste.com',
              zipcode: '01310-100',
              street: 'Rua Teste',
              number: '123',
              complement: 'Apto 1',
              district: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              reference: null,
              lat: -23.5505,
              lng: -46.6333,
            },
          },
          dropoff: {
            address: {
              recipient: 'Cliente Teste',
              phone: '+5511888888888',
              email: 'cliente@teste.com',
              zipcode: '01310-200',
              street: 'Av Teste',
              number: '456',
              complement: null,
              district: 'Bela Vista',
              city: 'São Paulo',
              state: 'SP',
              reference: 'Próximo ao mercado',
              lat: -23.551,
              lng: -46.634,
            },
          },
          items: [
            {
              description: 'Produto Teste',
              weight: 500,
              length: 20,
              width: 15,
              height: 10,
              quantity: 2,
            },
          ],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should use production URL when environment is production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'production',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            totalCost: 30.0,
            serviceLevels: ['SPT'],
          },
        }),
      });

      await service.quoteDelivery({
        pickup: {
          address: {
            recipient: 'Loja Teste',
            phone: '+5511999999999',
            email: 'loja@teste.com',
            zipcode: '01310-100',
            street: 'Rua Teste',
            number: '123',
            complement: 'Apto 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
        },
        dropoff: {
          address: {
            recipient: 'Cliente Teste',
            phone: '+5511888888888',
            email: 'cliente@teste.com',
            zipcode: '01310-200',
            street: 'Av Teste',
            number: '456',
            complement: null,
            district: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            reference: 'Próximo ao mercado',
            lat: -23.551,
            lng: -46.634,
          },
        },
        items: [
          {
            description: 'Produto Teste',
            weight: 500,
            length: 20,
            width: 15,
            height: 10,
            quantity: 2,
          },
        ],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://delivery.99minutos.com/api/v3/shipping/rates/coordinates/BRA/-23.550500/-46.633300/BRA/-23.551000/-46.634000',
        expect.any(Object),
      );
    });
  });

  describe('Create Delivery', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });
    });

    it('should create delivery successfully with real data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          _id: 'order-123',
          shipments: [
            {
              trackingId: 'tracking-123',
              internalKey: 'delivery-456',
            },
          ],
        }),
      });

      const result = await service.createDelivery({
        deliveryId: 'delivery-456',
        storeSettings: {
          name: 'Minha Loja',
          phone: '+5511999999999',
          email: 'contato@loja.com',
          zipcode: '01310-100',
          street: 'Rua da Loja',
          number: '100',
          complement: 'Loja 1',
          district: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          reference: null,
          lat: -23.5505,
          lng: -46.6333,
        },
        order: {
          shippingRecipient: 'João Silva',
          shippingPhone: '+5511888888888',
          shippingEmail: 'joao@email.com',
          shippingZipcode: '01310-200',
          shippingStreet: 'Av Paulista',
          shippingNumber: '500',
          shippingComplement: 'Apto 10',
          shippingDistrict: 'Bela Vista',
          shippingCity: 'São Paulo',
          shippingState: 'SP',
          shippingReference: 'Em frente ao parque',
          shippingLat: -23.551,
          shippingLng: -46.634,
        },
        items: [
          {
            description: 'Camiseta Básica',
            weight: 200,
            length: 25,
            width: 18,
            height: 5,
            quantity: 3,
          },
        ],
      });

      expect(result.externalDeliveryId).toBe('tracking-123');
      expect(result.quoteId).toBe('delivery-456');
      expect(result.status).toBe('REQUESTING');
    });

    it('should throw error when store lacks coordinates', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: null,
            lng: null,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when order lacks coordinates', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: null,
            shippingLng: null,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when store lacks phone', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: null,
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when store lacks email', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: null,
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when customer lacks phone', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: null,
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when customer lacks email', async () => {
      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: null,
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when API request fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw error when API does not return tracking ID', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          _id: 'order-123',
          shipments: [], // Empty shipments
        }),
      });

      await expect(
        service.createDelivery({
          deliveryId: 'delivery-456',
          storeSettings: {
            name: 'Minha Loja',
            phone: '+5511999999999',
            email: 'contato@loja.com',
            zipcode: '01310-100',
            street: 'Rua da Loja',
            number: '100',
            complement: 'Loja 1',
            district: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            reference: null,
            lat: -23.5505,
            lng: -46.6333,
          },
          order: {
            shippingRecipient: 'João Silva',
            shippingPhone: '+5511888888888',
            shippingEmail: 'joao@email.com',
            shippingZipcode: '01310-200',
            shippingStreet: 'Av Paulista',
            shippingNumber: '500',
            shippingComplement: 'Apto 10',
            shippingDistrict: 'Bela Vista',
            shippingCity: 'São Paulo',
            shippingState: 'SP',
            shippingReference: 'Em frente ao parque',
            shippingLat: -23.551,
            shippingLng: -46.634,
          },
          items: [
            {
              description: 'Camiseta Básica',
              weight: 200,
              length: 25,
              width: 18,
              height: 5,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('Get Delivery Status', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });
    });

    it('should get delivery status successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          StatusCode: '4002',
          StatusName: 'DELIVERED',
          TrackingId: 'tracking-123',
          InternalKey: 'delivery-456',
          Events: [
            {
              StatusCode: '4002',
              StatusName: 'DELIVERED',
              CreatedAt: '2026-08-18T12:00:00Z',
              Data: {
                driverName: 'João Motorista',
                driverPhone: '+5511777777777',
              },
            },
          ],
        }),
      });

      const result = await service.getDeliveryStatus('tracking-123');

      expect(result.externalDeliveryId).toBe('tracking-123');
      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(result.courierName).toBe('João Motorista');
      expect(result.courierPhone).toBe('+5511777777777');
      expect(result.deliveredAt).toBeDefined();
    });

    it('should map status codes correctly', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      const statusTests = [
        { code: '1002', expected: DeliveryStatus.REQUESTING },
        { code: '2002', expected: DeliveryStatus.SEARCHING_DRIVER },
        { code: '2003', expected: DeliveryStatus.DRIVER_ASSIGNED },
        { code: '4001', expected: DeliveryStatus.IN_TRANSIT },
        { code: '4002', expected: DeliveryStatus.DELIVERED },
        { code: '8003', expected: DeliveryStatus.CANCELLED },
      ];

      for (const test of statusTests) {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            StatusCode: test.code,
            StatusName: 'TEST',
            TrackingId: 'tracking-123',
            InternalKey: 'delivery-456',
            Events: [],
          }),
        });

        const result = await service.getDeliveryStatus('tracking-123');
        expect(result.status).toBe(test.expected);
      }
    });
  });

  describe('Cancel Delivery', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NINENINE_ENVIRONMENT: 'sandbox',
          NINENINE_CLIENT_ID: 'test-client-id',
          NINENINE_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      });
    });

    it('should cancel delivery successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.cancelDelivery('tracking-123');

      expect(result.externalDeliveryId).toBe('tracking-123');
    });

    it('should throw error when cancel request fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(service.cancelDelivery('tracking-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('Webhook Validation', () => {
    it('should return false when webhook secret is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = service.validateWebhook('test-body', {});
      expect(result).toBe(false);
    });

    it('should return false when signature header is missing', () => {
      mockConfigService.get.mockReturnValue('test-secret');

      const result = service.validateWebhook('test-body', {});
      expect(result).toBe(false);
    });

    it('should validate webhook signature correctly with official header', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      const crypto = require('crypto');
      const body = 'test-body';
      const expected = crypto
        .createHmac('sha256', 'test-secret')
        .update(body)
        .digest('hex');

      const result = service.validateWebhook(body, {
        'x-99minutos-signature': expected,
      });
      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      mockConfigService.get.mockReturnValue('test-secret');

      const result = service.validateWebhook('test-body', {
        'x-99minutos-signature': 'invalid-signature',
      });
      expect(result).toBe(false);
    });

    it('should not accept alternative headers (only official)', () => {
      mockConfigService.get.mockReturnValue('test-secret');
      const crypto = require('crypto');
      const body = 'test-body';
      const expected = crypto
        .createHmac('sha256', 'test-secret')
        .update(body)
        .digest('hex');

      // Only x-99minutos-signature should be accepted
      const result = service.validateWebhook(body, {
        'x-ninenine-signature': expected,
      });
      expect(result).toBe(false);
    });
  });

  describe('Webhook Payload Normalization', () => {
    it('should normalize valid webhook payload', () => {
      const payload = {
        TrackingId: 'tracking-123',
        InternalKey: 'delivery-456',
        StatusCode: '4002',
        StatusName: 'DELIVERED',
        Events: [
          {
            StatusCode: '4002',
            StatusName: 'DELIVERED',
            CreatedAt: '2026-08-18T12:00:00Z',
          },
        ],
      };

      const result = service.normalizeWebhookPayload(payload);

      expect(result).toEqual({
        trackingId: 'tracking-123',
        internalKey: 'delivery-456',
        statusCode: '4002',
        statusName: 'DELIVERED',
        eventTime: new Date('2026-08-18T12:00:00Z'),
      });
    });

    it('should return null for invalid payload', () => {
      const result = service.normalizeWebhookPayload(null);
      expect(result).toBeNull();
    });

    it('should return null for payload without tracking ID', () => {
      const payload = {
        StatusCode: '4002',
        StatusName: 'DELIVERED',
      };

      const result = service.normalizeWebhookPayload(payload);
      expect(result).toBeNull();
    });

    it('should handle lowercase field names', () => {
      const payload = {
        trackingId: 'tracking-123',
        internalKey: 'delivery-456',
        statusCode: '4002',
        statusName: 'DELIVERED',
      };

      const result = service.normalizeWebhookPayload(payload);

      expect(result).toEqual({
        trackingId: 'tracking-123',
        internalKey: 'delivery-456',
        statusCode: '4002',
        statusName: 'DELIVERED',
        eventTime: null,
      });
    });
  });

  describe('Status Mapping', () => {
    it('should map 99minutos status codes to internal delivery status', () => {
      const mappingTests = [
        { code: '1001', name: 'DRAFT', expected: DeliveryStatus.QUOTED },
        {
          code: '1002',
          name: 'CONFIRMED',
          expected: DeliveryStatus.REQUESTING,
        },
        {
          code: '2002',
          name: 'CONDUCTOR ASIGNADO',
          expected: DeliveryStatus.SEARCHING_DRIVER,
        },
        {
          code: '2003',
          name: 'RECOGIDA CONFIRMADA',
          expected: DeliveryStatus.DRIVER_ASSIGNED,
        },
        {
          code: '4001',
          name: 'ON ROAD TO DELIVERY',
          expected: DeliveryStatus.IN_TRANSIT,
        },
        { code: '4002', name: 'DELIVERED', expected: DeliveryStatus.DELIVERED },
        { code: '8003', name: 'CANCELLED', expected: DeliveryStatus.CANCELLED },
        {
          code: '2101',
          name: 'UNSUCCESSFUL PICKUP',
          expected: DeliveryStatus.FAILED,
        },
        {
          code: '4101',
          name: 'UNSUCCESSFUL DELIVERY',
          expected: DeliveryStatus.FAILED,
        },
      ];

      for (const test of mappingTests) {
        const result = service.mapStatusToDeliveryStatus(test.code, test.name);
        expect(result).toBe(test.expected);
      }
    });

    it('should return null for unknown status codes', () => {
      const result = service.mapStatusToDeliveryStatus('9999', 'UNKNOWN');
      expect(result).toBeNull();
    });
  });

  describe('Package Calculation', () => {
    it('should calculate package dimensions correctly', () => {
      const items = [
        {
          description: 'Item 1',
          weight: 500,
          length: 20,
          width: 15,
          height: 10,
          quantity: 2,
        },
        {
          description: 'Item 2',
          weight: 300,
          length: 25,
          width: 18,
          height: 12,
          quantity: 1,
        },
      ];

      const result = service['calculatePackageDimensions'](items);

      expect(result.weight).toBe(1300); // 500*2 + 300*1
      expect(result.length).toBe(25); // max
      expect(result.width).toBe(18); // max
      expect(result.height).toBe(12); // max
    });

    it('should throw error for empty items', () => {
      expect(() => service['calculatePackageDimensions']([])).toThrow(
        BadRequestException,
      );
    });

    it('should determine package size correctly', () => {
      const tests = [
        {
          dimensions: { weight: 100, length: 5, width: 5, height: 5 },
          expected: 'xs',
        }, // 125 cm³
        {
          dimensions: { weight: 1000, length: 15, width: 15, height: 15 },
          expected: 's',
        }, // 3,375 cm³
        {
          dimensions: { weight: 2000, length: 25, width: 25, height: 25 },
          expected: 'l',
        }, // 15,625 cm³ -> actually 'l' based on implementation (>= 15000)
        {
          dimensions: { weight: 5000, length: 35, width: 35, height: 35 },
          expected: 'xl',
        }, // 42,875 cm³
        {
          dimensions: { weight: 10000, length: 50, width: 50, height: 50 },
          expected: 'xl',
        }, // 125,000 cm³
      ];

      for (const test of tests) {
        const result = service['determinePackageSize'](test.dimensions);
        expect(result).toBe(test.expected);
      }
    });

    it('should format coordinates to 6 decimal places', () => {
      const tests = [
        { value: -23.5505, expected: '-23.550500' },
        { value: -46.6333, expected: '-46.633300' },
        { value: -23.551, expected: '-23.551000' },
        { value: -46.634, expected: '-46.634000' },
        { value: 0, expected: '0.000000' },
        { value: 123.456789, expected: '123.456789' },
      ];

      for (const test of tests) {
        const result = service['formatCoordinate'](test.value);
        expect(result).toBe(test.expected);
      }
    });
  });
});
