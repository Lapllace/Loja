import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type OrderWithItems = Order & { items: OrderItem[] };
type SerializedUser = { id: string; role: UserRole };

type ValidatedOrderItem = {
  cartItem: OrderItem;
  product: Product;
  itemTotal: Prisma.Decimal;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

  private serializeOrder(order: OrderWithItems, user: SerializedUser) {
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items ?? []).map((item) =>
        this.serializeItem(item, includeCostPrice),
      ),
    };
  }

  private async validateCartItems(
    tx: Prisma.TransactionClient,
    cartItems: OrderItem[],
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
      const previousStock = product.stock;

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

      const currentStock = previousStock - quantity;

      await tx.orderItem.create({
        data: {
          orderId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity,
          price: product.price,
          costPrice: product.costPrice,
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

  async create(userId: string, data: CreateOrderDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx) => {
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
      const shipping = new Prisma.Decimal(0);
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

    const allowed = new Set<OrderStatus>([
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ]);

    if (!allowed.has(data.status)) {
      const blocked = new Set<OrderStatus>([
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ]);
      if (blocked.has(data.status)) {
        throw new BadRequestException(
          'Order status CANCELLED or REFUNDED is not available yet.',
        );
      }
      throw new BadRequestException('Invalid order status');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Only ADMIN or OWNER can update order status',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: { items: true },
    });

    return this.serializeOrder(updated, user);
  }

  async remove(user: SerializedUser, id: string) {
    void user;
    void id;
    throw new ForbiddenException(
      'Orders are historical records and cannot be deleted.',
    );
  }
}
