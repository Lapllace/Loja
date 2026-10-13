import { ConfigService } from '@nestjs/config';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../database/prisma.service';

describe('ShippingService', () => {
  const prismaMock = {
    product: { findMany: jest.fn() },
  };
  const configMock = {
    get: jest.fn(),
  };
  let service: ShippingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ShippingService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'product-1', weight: 1, height: 10, width: 10, length: 10 },
    ]);
  });

  it('uses valid SuperFrete options and marks their source', async () => {
    jest.spyOn(service as any, 'fetchSuperfreteOptions').mockResolvedValue([
      { id: 'sf-express', name: 'Expressa', price: 20, deliveryDays: 2 },
    ]);

    await expect(
      service.calculate({ zipcode: '01001000', items: [{ productId: 'product-1', quantity: 1 }] }),
    ).resolves.toEqual({
      source: 'superfrete',
      options: [
        { id: 'sf-express', name: 'Expressa', price: 20, deliveryDays: 2 },
      ],
    });
  });

  it('uses regional fallback when SuperFrete throws', async () => {
    jest.spyOn(service as any, 'fetchSuperfreteOptions').mockRejectedValue(new Error('offline'));

    const quote = await service.calculate({
      zipcode: '01001000',
      items: [{ productId: 'product-1', quantity: 1 }],
    });

    expect(quote.source).toBe('fallback');
    expect(quote.options).toEqual([
      { id: 'fallback_sudeste', name: 'Frete fixo (Sudeste)', price: 19.9, deliveryDays: 4 },
    ]);
  });

  it('treats an HTTP 200 response with no usable options as a fallback failure', async () => {
    jest.spyOn(service as any, 'fetchSuperfreteOptions').mockResolvedValue([]);

    const quote = await service.calculate({
      zipcode: '44010000',
      items: [{ productId: 'product-1', quantity: 1 }],
    });

    expect(quote.source).toBe('fallback');
    expect(quote.options).toEqual(expect.arrayContaining([
      { id: 'fallback_nordeste', name: 'Frete fixo (Nordeste/Norte)', price: 29.9, deliveryDays: 7 },
      { id: 'local_motoboy', name: 'Motoboy / Entrega Local', price: 10, deliveryDays: 1, isLocal: true },
    ]));
  });
});