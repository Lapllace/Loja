import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';
import { PagBankService } from './pagbank.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const prismaMock = {
    order: { findUnique: jest.fn() },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    delivery: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const pagBankMock = {
    createPixCheckout: jest.fn(),
    validateWebhookToken: jest.fn(),
    isWebhookTokenConfigured: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    pagBankMock.isWebhookTokenConfigured.mockReturnValue(true);
    pagBankMock.validateWebhookToken.mockReturnValue(true);
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PagBankService, useValue: pagBankMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should reject method different from PIX', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'ONLINE',
      status: OrderStatus.PENDING,
      total: '100.00',
      number: 10,
      items: [
        { productName: 'Produto', quantity: 1, price: 100, total: '100.00' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });

    await expect(
      service.create(
        { id: 'user-1', role: UserRole.CUSTOMER },
        { orderId: 'order-1', method: PaymentMethod.CREDIT_CARD },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject physical orders in PagBank checkout', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'PHYSICAL',
      status: OrderStatus.PENDING,
      total: '100.00',
      number: 10,
      items: [
        { productName: 'Produto', quantity: 1, price: 100, total: '100.00' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });

    await expect(
      service.create(
        { id: 'user-1', role: UserRole.CUSTOMER },
        { orderId: 'order-1', method: PaymentMethod.PIX },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create payment with source and provider ONLINE/PAGBANK', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'ONLINE',
      status: OrderStatus.PENDING,
      total: '100.00',
      number: 10,
      items: [
        { productName: 'Produto', quantity: 1, price: 100, total: '100.00' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '100.00',
      provider: null,
      transactionId: null,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    pagBankMock.createPixCheckout.mockResolvedValue({
      provider: 'PAGBANK',
      transactionId: 'chk_123',
      checkoutUrl: 'https://pagbank.test/checkout',
      pixQrCode: 'qr-code',
      pixCopyPaste: 'copy-paste',
      expiresAt: '2026-08-19T00:00:00.000Z',
    });
    prismaMock.payment.update.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '100.00',
      provider: 'PAGBANK',
      transactionId: 'chk_123',
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(
      { id: 'user-1', role: UserRole.CUSTOMER },
      { orderId: 'order-1', method: PaymentMethod.PIX },
    );

    expect(result.provider).toBe('PAGBANK');
    expect(result.source).toBe(PaymentSource.ONLINE);
    expect(result.transactionId).toBe('chk_123');
  });

  it('should use unit price for checkout item and calculate total from items', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'ONLINE',
      status: OrderStatus.PENDING,
      total: '250.00',
      number: 10,
      items: [
        { productName: 'A', quantity: 2, price: 50, total: '100.00' },
        { productName: 'B', quantity: 3, price: 50, total: '150.00' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '250.00',
      provider: null,
      transactionId: null,
    });
    pagBankMock.createPixCheckout.mockResolvedValue({
      provider: 'PAGBANK',
      transactionId: 'chk_456',
      checkoutUrl: 'https://pagbank.test/checkout',
      pixQrCode: null,
      pixCopyPaste: null,
      expiresAt: null,
    });
    prismaMock.payment.update.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '250.00',
      provider: 'PAGBANK',
      transactionId: 'chk_456',
    });

    await service.create(
      { id: 'user-1', role: UserRole.CUSTOMER },
      { orderId: 'order-1', method: PaymentMethod.PIX },
    );

    expect(pagBankMock.createPixCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ total: '250.00' }),
      expect.objectContaining({ id: 'payment-1' }),
    );
  });

  it('should reject ADMIN and OWNER creating payment', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'ONLINE',
      status: OrderStatus.PENDING,
      total: '100.00',
      number: 10,
      items: [
        { productName: 'Produto', quantity: 1, price: 100, total: '100.00' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });

    await expect(
      service.create(
        { id: 'admin-1', role: UserRole.ADMIN },
        { orderId: 'order-1', method: PaymentMethod.PIX },
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.create(
        { id: 'owner-1', role: UserRole.OWNER },
        { orderId: 'order-1', method: PaymentMethod.PIX },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject webhook without configured token', async () => {
    pagBankMock.isWebhookTokenConfigured.mockReturnValue(false);

    await expect(
      service.handlePagBankWebhook(JSON.stringify({ status: 'PAID' }), {
        'x-authenticity-token': 'abc',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('should reject webhook without x-authenticity-token header', async () => {
    pagBankMock.isWebhookTokenConfigured.mockReturnValue(true);
    pagBankMock.validateWebhookToken.mockReturnValue(false);

    await expect(
      service.handlePagBankWebhook(JSON.stringify({ status: 'PAID' }), {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject webhook with incorrect authenticity signature', async () => {
    pagBankMock.isWebhookTokenConfigured.mockReturnValue(true);
    pagBankMock.validateWebhookToken.mockReturnValue(false);

    await expect(
      service.handlePagBankWebhook(JSON.stringify({ status: 'PAID' }), {
        'x-authenticity-token': 'wrong',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should accept webhook with valid authenticity signature', async () => {
    const rawBody = JSON.stringify({
      status: 'PAID',
      data: { id: 'chk_999', reference_id: 'order-10' },
    });
    pagBankMock.validateWebhookToken.mockReturnValue(true);
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
      transactionId: 'chk_999',
      order: { id: 'order-1' },
    });
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        payment: {
          update: jest.fn().mockResolvedValue({}),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        order: { update: jest.fn().mockResolvedValue({}) },
      }),
    );

    await expect(
      service.handlePagBankWebhook(rawBody, {
        'x-authenticity-token': 'valid',
      }),
    ).resolves.toMatchObject({ ok: true, status: 'PAID' });
  });

  it('should idempotently ignore repeated paid webhook', async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.PAID,
      transactionId: 'chk_999',
      order: { id: 'order-1' },
    });
    pagBankMock.validateWebhookToken.mockReturnValue(true);

    await expect(
      service.handlePagBankWebhook(
        JSON.stringify({ status: 'PAID', data: { id: 'chk_999' } }),
        { 'x-authenticity-token': 'valid' },
      ),
    ).resolves.toMatchObject({ idempotent: true });
  });

  it('should not let customer update payment status', async () => {
    await expect(
      service.update({ id: 'user-1', role: UserRole.CUSTOMER }, 'payment-1', {
        status: PaymentStatus.PAID,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should restore stock and create one return movement when cancelling a pending order without payment', async () => {
    const pendingOrder = {
      id: 'order-1',
      status: OrderStatus.PENDING,
      payment: null,
    };
    const cancelledOrder = {
      id: 'order-1',
      status: OrderStatus.CANCELLED,
      items: [],
    };
    const tx = {
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(pendingOrder)
          .mockResolvedValueOnce(cancelledOrder),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([
          { productId: 'product-1', quantity: 2 },
        ]),
      },
      product: {
        update: jest.fn().mockResolvedValue({ stock: 8 }),
      },
      stockMovement: { create: jest.fn().mockResolvedValue({}) },
      delivery: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      service.cancelOrRefundOrder('order-1', OrderStatus.CANCELLED),
    ).resolves.toEqual(cancelledOrder);

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED },
    });
    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
        type: 'RETURN',
        quantity: 2,
        previousStock: 6,
        currentStock: 8,
      }),
    });
  });

  it('should not compensate stock when a concurrent cancellation already changed the order', async () => {
    const tx = {
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.PENDING,
            payment: null,
          })
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.CANCELLED,
            items: [],
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      orderItem: { findMany: jest.fn() },
      product: { update: jest.fn() },
      stockMovement: { create: jest.fn() },
      delivery: { updateMany: jest.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      service.cancelOrRefundOrder('order-1', OrderStatus.CANCELLED),
    ).resolves.toMatchObject({ status: OrderStatus.CANCELLED });

    expect(tx.orderItem.findMany).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('should keep amount derived from Order.total', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      origin: 'ONLINE',
      status: OrderStatus.PENDING,
      total: '350.50',
      number: 12,
      items: [
        { productName: 'Produto', quantity: 1, price: 350.5, total: '350.50' },
      ],
      user: { name: 'Cliente', email: 'cliente@email.com' },
    });
    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({
      id: 'payment-2',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '350.50',
      provider: null,
      transactionId: null,
    });
    pagBankMock.createPixCheckout.mockResolvedValue({
      provider: 'PAGBANK',
      transactionId: 'chk_350',
      checkoutUrl: 'https://pagbank.test/checkout',
      pixQrCode: null,
      pixCopyPaste: null,
      expiresAt: null,
    });
    prismaMock.payment.update.mockResolvedValue({
      id: 'payment-2',
      orderId: 'order-1',
      method: PaymentMethod.PIX,
      source: PaymentSource.ONLINE,
      status: PaymentStatus.PENDING,
      amount: '350.50',
      provider: 'PAGBANK',
      transactionId: 'chk_350',
    });

    const result = await service.create(
      { id: 'user-1', role: UserRole.CUSTOMER },
      { orderId: 'order-1', method: PaymentMethod.PIX },
    );

    expect(result.amount).toBe('350.50');
  });

  it('should not expose costPrice to customer response', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        orderId: 'order-1',
        method: PaymentMethod.PIX,
        source: PaymentSource.ONLINE,
        status: PaymentStatus.PENDING,
        amount: '100.00',
        provider: 'PAGBANK',
        transactionId: 'chk_999',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: { userId: 'user-1' },
      },
    ]);

    const result = await service.findAll({
      id: 'user-1',
      role: UserRole.CUSTOMER,
    });
    expect(result[0]).not.toHaveProperty('costPrice');
  });

  it('should compute sha256 authenticity token exactly from token + raw body', () => {
    const payload = JSON.stringify({ status: 'PAID' });
    const token = 'pagbank-token';
    const expected = createHash('sha256')
      .update(`${token}-${payload}`)
      .digest('hex');

    expect(expected.length).toBe(64);
    expect(expected).toBe(
      createHash('sha256').update(`${token}-${payload}`).digest('hex'),
    );
  });
});
