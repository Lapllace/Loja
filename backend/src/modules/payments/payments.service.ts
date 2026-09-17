import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentSource, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PagBankService } from './pagbank.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagBankService: PagBankService,
  ) {}

  private serializePayment(payment: any) {
    const amountValue = payment?.amount == null ? '0' : typeof payment.amount === 'string' ? payment.amount : payment.amount.toString();

    return {
      id: payment.id,
      orderId: payment.orderId,
      method: payment.method,
      source: payment.source,
      status: payment.status,
      amount: amountValue,
      transactionId: payment.transactionId,
      provider: payment.provider,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private async ensureOrderOwnedByUser(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER && order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async create(user: any, data: CreatePaymentDto) {
    const order = await this.ensureOrderOwnedByUser(data.orderId, user);

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create payments');
    }

    if (data.method !== PaymentMethod.PIX) {
      throw new BadRequestException('Only PIX online payment is available in this stage.');
    }

    if (order.origin !== 'ONLINE') {
      throw new BadRequestException('Only ONLINE orders can use PagBank');
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order is refunded and cannot receive a new payment');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { orderId: data.orderId },
      include: { order: { include: { user: true } } },
    });

    if (existing) {
      if (existing.status === PaymentStatus.PAID) {
        return this.serializePayment(existing);
      }

      if (existing.status === PaymentStatus.REFUNDED) {
        throw new BadRequestException('Payment has already been refunded');
      }

      if (existing.provider === 'PAGBANK' && existing.transactionId) {
        return this.serializePayment(existing);
      }

      if (existing.status === PaymentStatus.PENDING) {
        return this.serializePayment(existing);
      }

      throw new ConflictException('Payment already exists for this order');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: PaymentMethod.PIX,
        source: PaymentSource.ONLINE,
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
      include: { order: { include: { user: true } } },
    });

    try {
      const pagbankCheckout = await this.pagBankService.createPixCheckout(order, payment);

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: pagbankCheckout.provider,
          transactionId: pagbankCheckout.transactionId,
          method: PaymentMethod.PIX,
          source: PaymentSource.ONLINE,
        },
        include: { order: { include: { user: true } } },
      });

      return {
        ...this.serializePayment(updated),
        checkoutUrl: pagbankCheckout.checkoutUrl,
        pixQrCode: pagbankCheckout.pixQrCode,
        pixCopyPaste: pagbankCheckout.pixCopyPaste,
        expiresAt: pagbankCheckout.expiresAt,
      };
    } catch (error: any) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException('PagBank payment checkout could not be created');
    }
  }

  async findAll(user: any) {
    const where = user.role === UserRole.CUSTOMER ? { order: { userId: user.id } } : undefined;

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });

    return payments.map((payment: any) => this.serializePayment(payment));
  }

  async findOne(user: any, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (user.role === UserRole.CUSTOMER && payment.order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return this.serializePayment(payment);
  }

  async update(user: any, id: string, data: UpdatePaymentDto) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only ADMIN or OWNER can update payment status');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
      },
    });

    return this.serializePayment(updated);
  }

  async remove(user: any, id: string) {
    void user;
    void id;
    throw new ForbiddenException('Payments are historical records and cannot be deleted.');
  }

  async handlePagBankWebhook(rawBody: unknown, headers?: Record<string, any>) {
    const payloadText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {});
    let webhook: any;

    try {
      webhook = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    if (!this.pagBankService.isWebhookTokenConfigured()) {
      throw new ServiceUnavailableException('PagBank webhook token is not configured');
    }

    const tokenValid = this.pagBankService.validateWebhookToken(headers, rawBody);
    if (tokenValid === false) {
      throw new ForbiddenException('Invalid PagBank webhook token');
    }

    const status = String(
      webhook?.status ??
        webhook?.current_status ??
        webhook?.data?.status ??
        webhook?.data?.current_status ??
        webhook?.event ??
        '',
    ).toUpperCase();
    const referenceId = String(
      webhook?.reference_id ??
        webhook?.referenceId ??
        webhook?.data?.reference_id ??
        webhook?.data?.referenceId ??
        webhook?.data?.reference?.id ??
        '',
    );
    const transactionId = String(
      webhook?.data?.id ??
        webhook?.data?.transaction_id ??
        webhook?.data?.transactionId ??
        webhook?.id ??
        webhook?.transaction_id ??
        webhook?.transactionId ??
        '',
    );

    const referenceValue = referenceId ? referenceId.replace(/^order-/, '') : '';
    const referenceNumber = referenceValue ? Number(referenceValue) : NaN;

    const referenceConditions = referenceValue
      ? [
          { order: { id: referenceValue } },
          ...(Number.isFinite(referenceNumber) && referenceNumber > 0
            ? [{ order: { number: referenceNumber }]
            : []),
        ]
      : [];

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(transactionId ? [{ transactionId }] : []),
          ...referenceConditions,
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for PagBank webhook');
    }

    if (payment.status === PaymentStatus.PAID) {
      return { ok: true, idempotent: true, paymentId: payment.id, orderId: payment.orderId };
    }

    if (status.includes('PAID') || status.includes('APPROVED') || status.includes('AUTHORIZED') || status.includes('CONFIRMED')) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            provider: 'PAGBANK',
            transactionId: transactionId || payment.transactionId,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });
      });

      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'PAID' };
    }

    if (status.includes('PENDING')) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PENDING },
      });
      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'PENDING' };
    }

    if (status.includes('FAILED') || status.includes('CANCEL') || status.includes('REJECTED')) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'FAILED' };
    }

    return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: payment.status };
  }
}
