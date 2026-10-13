import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderItem,
  OrderOrigin,
  OrderStatus,
  Prisma,
  Product,
  StockMovementType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MetaWhatsappService } from '../notifications/meta-whatsapp.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type OrderWithItems = Order & { items: OrderItem[] };
type SerializedUser = { id: string; role: UserRole };

type CartItem = { productId: string; quantity: number };

type ValidatedOrderItem = {
  cartItem: CartItem;
  product: Product;
  itemTotal: Prisma.Decimal;
};

/** Formata um valor Decimal/number/string para "R$ 0,00". */
function brl(value: Prisma.Decimal | number | string): string {
  const n =
    typeof value === 'object' ? Number(value.toString()) : Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: MetaWhatsappService,
    private readonly shippingService: ShippingService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private serializeItem(item: OrderItem, includeCostPrice: boolean) {
    const base: Record<string, unknown> = {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      createdAt: item.createdAt,
    };
    if (includeCostPrice) {
      base.costPrice = item.costPrice;
    }
    return base;
  }

  private serializeOrder(
    order: OrderWithItems,
    user: Pick<SerializedUser, 'role'>,
  ) {
    const includeCostPrice = user.role === UserRole.OWNER;
    return {
      id: order.id,
      number: order.number,
      userId: order.userId,
      origin: order.origin,
      status: order.status,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      notes: order.notes,
      shippingRecipient: order.shippingRecipient,
      shippingZipcode: order.shippingZipcode,
      shippingStreet: order.shippingStreet,
      shippingNumber: order.shippingNumber,
      shippingComplement: order.shippingComplement,
      shippingDistrict: order.shippingDistrict,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingReference: order.shippingReference,
      shippingOptionId: order.shippingOptionId,
      shippingOptionName: order.shippingOptionName,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items ?? []).map((item) =>
        this.serializeItem(item, includeCostPrice),
      ),
    };
  }

  private async validateCartItems(
    tx: Prisma.TransactionClient,
    cartItems: CartItem[],
  ) {
    const validatedItems: ValidatedOrderItem[] = [];
    let subtotal = new Prisma.Decimal(0);

    for (const cartItem of cartItems) {
      const product = await tx.product.findUnique({
        where: { id: cartItem.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product not found: ${cartItem.productId}`);
      }
      if (!product.active) {
        throw new BadRequestException(`Product is not active: ${product.name}`);
      }
      if (cartItem.quantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}`,
        );
      }
      if (product.costPrice === null || product.costPrice === undefined) {
        throw new BadRequestException(
          `Product does not have a costPrice registered: ${product.name}`,
        );
      }

      const itemTotal = new Prisma.Decimal(product.price.toString()).mul(
        cartItem.quantity,
      );
      subtotal = subtotal.add(itemTotal);
      validatedItems.push({ cartItem, product, itemTotal });
    }

    return { validatedItems, subtotal };
  }

  private async persistOrderItems(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId: string,
    validatedItems: ValidatedOrderItem[],
  ) {
    for (const { cartItem, product, itemTotal } of validatedItems) {
      const quantity = cartItem.quantity;
      const decrementResult = await tx.product.updateMany({
        where: {
          id: product.id,
          stock: { gte: quantity },
        },
        data: {
          stock: { decrement: quantity },
        },
      });

      if (decrementResult.count !== 1) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}`,
        );
      }

      const updatedProduct = await tx.product.findUnique({
        where: { id: product.id },
        select: { stock: true },
      });
      if (!updatedProduct) {
        throw new NotFoundException('Product not found during stock decrement');
      }
      const currentStock = updatedProduct.stock;
      const previousStock = currentStock + quantity;

      await tx.orderItem.create({
        data: {
          orderId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity,
          price: product.price,
          costPrice: new Prisma.Decimal(product.costPrice!.toString()),
          total: itemTotal,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: StockMovementType.SALE,
          quantity,
          previousStock,
          currentStock,
          reason: 'Order creation',
          createdById: userId,
        },
      });
    }
  }

  // ── Notification helpers ────────────────────────────────────────────────────

  /**
   * Busca o telefone do dono do pedido e dispara notificação.
   * Fire-and-forget: erros são absorvidos para não impactar o fluxo de negócio.
   */
  private fireOrderCreated(
    orderId: string,
    orderNumber: number,
    total: Prisma.Decimal,
  ): void {
    void (async () => {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { user: { select: { phone: true, name: true } } },
        });
        const phone = order?.user?.phone;
        if (!phone) return;

        const message =
          `✅ *Pedido #${orderNumber} recebido!*\n\n` +
          `Total: *${brl(total)}*\n\n` +
          `Aguardando confirmação do pagamento.\n` +
          `Acesse o aplicativo do seu banco e pague via PIX Copia e Cola — ` +
          `o código está disponível na tela de confirmação do pedido.`;

        await this.whatsapp.sendTextMessage(phone, message);
      } catch (err) {
        this.logger.warn(
          `Notification (order created) failed silently: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();
  }

  private firePaymentConfirmed(orderId: string, orderNumber: number): void {
    void (async () => {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { user: { select: { phone: true } } },
        });
        const phone = order?.user?.phone;
        if (!phone) return;

        const message =
          `🎉 *Pagamento confirmado — Pedido #${orderNumber}!*\n\n` +
          `Seu pedido foi pago e já está em preparação.\n` +
          `Em breve você receberá o código de rastreio.`;

        await this.whatsapp.sendTextMessage(phone, message);
      } catch (err) {
        this.logger.warn(
          `Notification (payment confirmed) failed silently: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();
  }

  private fireOrderShipped(orderId: string, orderNumber: number): void {
    void (async () => {
      try {
        const [orderRow, delivery] = await Promise.all([
          this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: { select: { phone: true } } },
          }),
          this.prisma.delivery.findUnique({
            where: { orderId },
            select: { trackingCode: true, trackingUrl: true },
          }),
        ]);

        const phone = orderRow?.user?.phone;
        if (!phone) return;

        const trackingLine = delivery?.trackingCode
          ? `\n\n📦 *Código de rastreio:* ${delivery.trackingCode}` +
            (delivery.trackingUrl ? `\n🔗 ${delivery.trackingUrl}` : '')
          : '';

        const message =
          `🚚 *Pedido #${orderNumber} enviado!*\n\n` +
          `Seu pedido está a caminho.` +
          trackingLine;

        await this.whatsapp.sendTextMessage(phone, message);
      } catch (err) {
        this.logger.warn(
          `Notification (order shipped) failed silently: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();
  }

  // ── Public methods ──────────────────────────────────────────────────────────

  async create(userId: string, data: CreateOrderDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Server-side shipping validation: recalculate shipping using actual cart items.
    // This prevents clients from sending arbitrary shipping prices.
    let serverShipping = new Prisma.Decimal(0);
    let validatedShippingOptionId: string | null = null;
    let validatedShippingOptionName: string | null = null;

    if (data.shippingOptionId || data.shippingOptionName) {
      // Pre-fetch cart items to calculate shipping before transaction
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (cart && cart.items.length > 0) {
        const shippingItems = cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));

        const quote = await this.shippingService.calculate({
          zipcode: address.zipcode,
          items: shippingItems,
        });

        const matchedOption = data.shippingOptionId
          ? quote.options.find((opt) => opt.id === data.shippingOptionId)
          : quote.options.find((opt) => opt.name === data.shippingOptionName);

        if (!matchedOption) {
          throw new BadRequestException(
            'Selected shipping option is not available for this address',
          );
        }

        serverShipping = new Prisma.Decimal(matchedOption.price.toFixed(2));
        validatedShippingOptionId = matchedOption.id;
        validatedShippingOptionName = matchedOption.name;
      }
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const { validatedItems, subtotal } = await this.validateCartItems(
        tx,
        cart.items,
      );
      const shipping = serverShipping;
      const discount = new Prisma.Decimal(0);
      const total = subtotal.sub(discount).add(shipping);

      const order = await tx.order.create({
        data: {
          userId,
          origin: OrderOrigin.ONLINE,
          status: OrderStatus.PENDING,
          subtotal,
          shipping,
          discount,
          total,
          notes: data.notes ?? null,
          shippingOptionId: validatedShippingOptionId,
          shippingOptionName: validatedShippingOptionName,
          shippingRecipient: address.recipient,
          shippingZipcode: address.zipcode,
          shippingStreet: address.street,
          shippingNumber: address.number,
          shippingComplement: address.complement,
          shippingDistrict: address.district,
          shippingCity: address.city,
          shippingState: address.state,
          shippingReference: address.reference,
        },
      });

      await this.persistOrderItems(tx, order.id, userId, validatedItems);

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      const created = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!created) {
        throw new NotFoundException('Order not found after creation');
      }

      return this.serializeOrder(created, { role: UserRole.CUSTOMER });
    });

    this.fireOrderCreated(
      createdOrder.id,
      createdOrder.number,
      createdOrder.total,
    );
    return createdOrder;
  }

  async findAll(user: SerializedUser) {
    const isCustomer = user.role === UserRole.CUSTOMER;

    const orders = await this.prisma.order.findMany({
      where: isCustomer ? { userId: user.id } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const responseRole =
      user.role === UserRole.OWNER ? UserRole.OWNER : UserRole.CUSTOMER;
    return orders.map((order) =>
      this.serializeOrder(order, { role: responseRole }),
    );
  }

  async findOne(user: SerializedUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role === UserRole.CUSTOMER && order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return this.serializeOrder(order, user);
  }

  async updateStatus(
    user: SerializedUser,
    id: string,
    data: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Only ADMIN or OWNER can update order status',
      );
    }

    const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]:    [OrderStatus.CANCELLED],
      [OrderStatus.PAID]:       [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]:    [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]:  [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]:  [],
      [OrderStatus.REFUNDED]:   [],
    };

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${data.status}`,
      );
    }

    const updated =
      data.status === OrderStatus.CANCELLED ||
      data.status === OrderStatus.REFUNDED
        ? await this.paymentsService.cancelOrRefundOrder(id, data.status)
        : await this.prisma.order.update({
            where: { id },
            data: { status: data.status },
            include: { items: true },
          });

    // Fire-and-forget notifications based on the new status.
    if (data.status === OrderStatus.PAID) {
      this.firePaymentConfirmed(updated.id, updated.number);
    } else if (data.status === OrderStatus.SHIPPED) {
      this.fireOrderShipped(updated.id, updated.number);
    }

    return this.serializeOrder(updated, user);
  }

  remove(user: SerializedUser, id: string): never {
    void user;
    void id;
    throw new ForbiddenException(
      'Orders are historical records and cannot be deleted.',
    );
  }
}
