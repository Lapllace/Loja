import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  Prisma,
  StockMovementType,
  UserRole,
} from '@prisma/client';
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

  /**
   * Core method that applies a payment status change atomically.
   * Handles Order status sync and stock compensation for cancellations.
   * Idempotent: if payment is already in the target state, returns false.
   *
   * @returns true if the state was changed, false if it was already in target state
   */
  private async applyPaymentStatusChange(
    payment: { id: string; orderId: string; status: PaymentStatus; order: { id: string; status: OrderStatus } },
    newStatus: PaymentStatus,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    // Idempotency: already in target state
    if (payment.status === newStatus) {
      return false;
    }

    const allowedTransitions: Partial<Record<PaymentStatus, PaymentStatus[]>> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.REFUNDED]: [],
    };
    if (!(allowedTransitions[payment.status] ?? []).includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition payment from ${payment.status} to ${newStatus}`,
      );
    }

    const updatePaymentData: Prisma.PaymentUpdateInput = { status: newStatus };

    if (newStatus === PaymentStatus.PAID) {
      updatePaymentData.paidAt = new Date();
    }

    const paymentUpdate = await tx.payment.updateMany({
      where: { id: payment.id, status: payment.status },
      data: updatePaymentData,
    });
    if (paymentUpdate.count !== 1) {
      return false;
    }

    if (newStatus === PaymentStatus.PAID) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });
    } else if (
      newStatus === PaymentStatus.FAILED ||
      newStatus === PaymentStatus.REFUNDED
    ) {
      const previousOrderStatus = payment.order.status;

      // Only compensate stock if the order was not already CANCELLED/REFUNDED
      const alreadyCancelled =
        previousOrderStatus === OrderStatus.CANCELLED ||
        previousOrderStatus === OrderStatus.REFUNDED;

      const targetOrderStatus =
        newStatus === PaymentStatus.REFUNDED
          ? OrderStatus.REFUNDED
          : OrderStatus.CANCELLED;

      if (!alreadyCancelled) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: targetOrderStatus },
        });

        // Restore stock for each order item
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: payment.orderId },
          select: { productId: true, quantity: true },
        });

        for (const item of orderItems) {
          const product = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
            select: { stock: true },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.RETURN,
              quantity: item.quantity,
              previousStock: product.stock - item.quantity,
              currentStock: product.stock,
              reason: `Payment ${newStatus.toLowerCase()} — order ${payment.orderId}`,
            },
          });
        }

        await tx.delivery.updateMany({
          where: {
            orderId: payment.orderId,
            status: {
              notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
            },
          },
          data: { status: DeliveryStatus.CANCELLED },
        });
      }
    }

    return true;
  }

  /**
   * Applies the same commercial effects used by payment callbacks when an
   * administrator cancels or refunds an order. This keeps order, payment,
   * stock movements and delivery aligned in one transaction.
   */
  async cancelOrRefundOrder(
    orderId: string,
    targetStatus: OrderStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REFUNDED
      ) {
        const existing = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (!existing) {
          throw new NotFoundException('Order not found');
        }
        return existing;
      }

      if (targetStatus === OrderStatus.CANCELLED) {
        if (order.status !== OrderStatus.PENDING) {
          throw new BadRequestException(
            `Cannot cancel order from ${order.status}; use refund for paid orders`,
          );
        }

        if (order.payment) {
          await this.applyPaymentStatusChange(
            {
              id: order.payment.id,
              orderId,
              status: order.payment.status,
              order: { id: order.id, status: order.status },
            },
            PaymentStatus.FAILED,
            tx,
          );
        } else {
          const cancellation = await tx.order.updateMany({
            where: { id: orderId, status: OrderStatus.PENDING },
            data: { status: OrderStatus.CANCELLED },
          });
          if (cancellation.count !== 1) {
            const current = await tx.order.findUnique({
              where: { id: orderId },
              include: { items: true },
            });
            if (
              current &&
              (current.status === OrderStatus.CANCELLED ||
                current.status === OrderStatus.REFUNDED)
            ) {
              return current;
            }
            throw new BadRequestException('Order status changed during cancellation');
          }

          const orderItems = await tx.orderItem.findMany({
            where: { orderId },
            select: { productId: true, quantity: true },
          });
          for (const item of orderItems) {
            const product = await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
              select: { stock: true },
            });
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: StockMovementType.RETURN,
                quantity: item.quantity,
                previousStock: product.stock - item.quantity,
                currentStock: product.stock,
                reason: `Order cancelled — order ${orderId}`,
              },
            });
          }
          await tx.delivery.updateMany({
            where: {
              orderId,
              status: { notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED] },
            },
            data: { status: DeliveryStatus.CANCELLED },
          });
        }
      } else {
        if (!order.payment || order.payment.status !== PaymentStatus.PAID) {
          throw new BadRequestException('Only paid orders can be refunded');
        }
        await this.applyPaymentStatusChange(
          {
            id: order.payment.id,
            orderId,
            status: order.payment.status,
            order: { id: order.id, status: order.status },
          },
          PaymentStatus.REFUNDED,
          tx,
        );
      }

      const updated = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!updated) {
        throw new NotFoundException('Order not found after status change');
      }
      return updated;
    });
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

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Cancelled or refunded orders cannot receive a new payment',
      );
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

    // Fetch the order with items for PagBank (needed for item-level validation)
    const orderWithItems = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { user: true, items: true },
    });

    if (!orderWithItems) {
      throw new NotFoundException('Order not found');
    }

    try {
      const pagbankCheckout = await this.pagBankService.createPixCheckout(orderWithItems, payment);

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
      // On PagBank failure, compensate stock (order items were already decremented)
      await this.prisma.$transaction(async (tx) => {
        await this.applyPaymentStatusChange(
          { id: payment.id, orderId: payment.orderId, status: PaymentStatus.PENDING, order: { id: payment.orderId, status: order.status } },
          PaymentStatus.FAILED,
          tx,
        );
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

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.applyPaymentStatusChange(payment, data.status, tx);
      return tx.payment.findUnique({ where: { id } });
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
            ? [{ order: { number: referenceNumber }}]
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

    if (payment.status !== PaymentStatus.PENDING) {
      return { ok: true, idempotent: true, paymentId: payment.id, orderId: payment.orderId };
    }

    if (status.includes('PAID') || status.includes('APPROVED') || status.includes('AUTHORIZED') || status.includes('CONFIRMED')) {
      await this.prisma.$transaction(async (tx) => {
        // Update transactionId before applying status change
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            provider: 'PAGBANK',
            transactionId: transactionId || payment.transactionId,
          },
        });
        await this.applyPaymentStatusChange(payment, PaymentStatus.PAID, tx);
      });

      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'PAID' };
    }

    if (status.includes('PENDING')) {
      if (payment.status !== PaymentStatus.PENDING) {
        return {
          ok: true,
          idempotent: true,
          paymentId: payment.id,
          orderId: payment.orderId,
          status: payment.status,
        };
      }
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PENDING },
      });
      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'PENDING' };
    }

    if (status.includes('FAILED') || status.includes('CANCEL') || status.includes('REJECTED')) {
      await this.prisma.$transaction(async (tx) => {
        await this.applyPaymentStatusChange(payment, PaymentStatus.FAILED, tx);
      });
      return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: 'FAILED' };
    }

    return { ok: true, paymentId: payment.id, orderId: payment.orderId, status: payment.status };
  }
}
