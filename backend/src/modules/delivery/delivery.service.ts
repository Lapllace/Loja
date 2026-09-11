import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeliveryMethod,
  DeliveryProvider,
  DeliveryStatus,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { UberDirectService } from './providers/uber-direct.service';
import { NinetyNineService, DeliveryProviderResult } from './providers/ninety-nine.service';

export interface DeliveryAddress {
  recipient: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  reference: string | null;
}

export interface DeliveryQuoteResponse {
  method: DeliveryMethod;
  provider: DeliveryProvider;
  shippingCost: number | string | null;
  estimatedDelivery: Date | null;
  quoteId: string | null;
  expiresAt: Date | null;
  destination: DeliveryAddress | null;
  pickup: DeliveryAddress;
}

interface DeliveryUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uberDirectService: UberDirectService,
    private readonly ninetyNineService: NinetyNineService,
  ) {}

  private normalizeAddress(address: {
    recipient?: string | null;
    zipcode?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    reference?: string | null;
  } | null): DeliveryAddress | null {
    if (!address) {
      return null;
    }

    return {
      recipient: address.recipient ?? '',
      zipcode: address.zipcode ?? '',
      street: address.street ?? '',
      number: address.number ?? '',
      complement: address.complement ?? null,
      district: address.district ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      reference: address.reference ?? null,
    };
  }

  private async getStoreDeliveryAddress(): Promise<DeliveryAddress> {
    const storeSettings = await this.prisma.storeSettings.findFirst();

    if (!storeSettings) {
      throw new BadRequestException('Store settings are not configured. Pickup address is not available.');
    }

    if (!storeSettings.name || !storeSettings.zipcode || !storeSettings.street || !storeSettings.number || !storeSettings.district || !storeSettings.city || !storeSettings.state) {
      throw new BadRequestException('Store settings are incomplete. Required fields: name, zipcode, street, number, district, city, state');
    }

    return {
      recipient: storeSettings.name,
      zipcode: storeSettings.zipcode,
      street: storeSettings.street,
      number: storeSettings.number,
      complement: storeSettings.complement ?? null,
      district: storeSettings.district,
      city: storeSettings.city,
      state: storeSettings.state,
      reference: null,
    };
  }

  private buildPendingAuthorizationPayload(delivery: {
    id: string;
    orderId: string;
    method: DeliveryMethod;
    shippingCost: string | number | { toString(): string };
    status: DeliveryStatus;
    estimatedDelivery: Date | null;
    order?: {
      number?: number | null;
      shippingRecipient?: string | null;
      shippingZipcode?: string | null;
      shippingStreet?: string | null;
      shippingNumber?: string | null;
      shippingComplement?: string | null;
      shippingDistrict?: string | null;
      shippingCity?: string | null;
      shippingState?: string | null;
      shippingReference?: string | null;
    } | null;
    createdAt: Date;
  }) {
    const destination = delivery.order
      ? {
          recipient: delivery.order.shippingRecipient ?? null,
          zipcode: delivery.order.shippingZipcode ?? null,
          street: delivery.order.shippingStreet ?? null,
          number: delivery.order.shippingNumber ?? null,
          complement: delivery.order.shippingComplement ?? null,
          district: delivery.order.shippingDistrict ?? null,
          city: delivery.order.shippingCity ?? null,
          state: delivery.order.shippingState ?? null,
          reference: delivery.order.shippingReference ?? null,
        }
      : null;

    return {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      orderNumber: delivery.order?.number ?? null,
      method: delivery.method,
      shippingCost: delivery.shippingCost.toString(),
      status: delivery.status,
      estimatedDelivery: delivery.estimatedDelivery,
      destination,
      createdAt: delivery.createdAt,
    };
  }

  private ensureMethodAllowed(method: DeliveryMethod) {
    if (![DeliveryMethod.PICKUP, DeliveryMethod.UBER, DeliveryMethod.NINENINE, DeliveryMethod.MANUAL].includes(method)) {
      throw new BadRequestException('Unsupported delivery method');
    }
  }

  private ensureStatusTransition(current: DeliveryStatus, next: DeliveryStatus) {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      PENDING: [DeliveryStatus.QUOTED, DeliveryStatus.REQUESTING, DeliveryStatus.READY_FOR_PICKUP],
      QUOTED: [DeliveryStatus.REQUESTING, DeliveryStatus.CANCELLED, DeliveryStatus.FAILED],
      REQUESTING: [DeliveryStatus.SEARCHING_DRIVER, DeliveryStatus.DRIVER_ASSIGNED, DeliveryStatus.CANCELLED, DeliveryStatus.FAILED],
      SEARCHING_DRIVER: [DeliveryStatus.DRIVER_ASSIGNED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
      DRIVER_ASSIGNED: [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
      READY_FOR_PICKUP: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED, DeliveryStatus.FAILED],
      PICKED_UP: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
      IN_TRANSIT: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED],
      DELIVERED: [],
      FAILED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Invalid delivery status transition from ${current} to ${next}`);
    }
  }

  private async getOrderForDelivery(orderId: string, user?: DeliveryUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true, user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user && user.role === UserRole.CUSTOMER && order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async quote(user: DeliveryUser, data: QuoteDeliveryDto): Promise<DeliveryQuoteResponse> {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can quote delivery');
    }

    const customerAddress = await this.prisma.address.findFirst({
      where: { id: data.addressId, userId: user.id },
    });

    if (!customerAddress) {
      throw new NotFoundException('Address not found');
    }

    const storeAddress = await this.getStoreDeliveryAddress();
    const dropoffAddress = this.normalizeAddress(customerAddress);

    if (!dropoffAddress) {
      throw new BadRequestException('Invalid customer address');
    }

    if (data.method === DeliveryMethod.PICKUP) {
      return {
        method: DeliveryMethod.PICKUP,
        provider: DeliveryProvider.NONE,
        shippingCost: 0,
        estimatedDelivery: null,
        quoteId: null,
        expiresAt: null,
        destination: dropoffAddress,
        pickup: storeAddress,
      };
    }

    if (data.method === DeliveryMethod.MANUAL) {
      return {
        method: DeliveryMethod.MANUAL,
        provider: DeliveryProvider.MANUAL,
        shippingCost: 0,
        estimatedDelivery: null,
        quoteId: null,
        expiresAt: null,
        destination: dropoffAddress,
        pickup: storeAddress,
      };
    }

    if (data.method === DeliveryMethod.UBER) {
      const providerResult = await this.uberDirectService.quoteDelivery({
        pickup: { address: storeAddress },
        dropoff: { address: dropoffAddress },
      });

      return {
        method: DeliveryMethod.UBER,
        provider: DeliveryProvider.UBER,
        shippingCost: providerResult.shippingCost ?? null,
        estimatedDelivery: providerResult.estimatedDelivery ?? null,
        quoteId: providerResult.quoteId ?? null,
        expiresAt: providerResult.expiresAt ?? null,
        destination: dropoffAddress,
        pickup: storeAddress,
      };
    }

    if (data.method === DeliveryMethod.NINENINE) {
      const storeSettings = await this.prisma.storeSettings.findFirst();
      if (!storeSettings) {
        throw new BadRequestException('Store settings are not configured');
      }

      // Validate store coordinates are available
      if (!storeSettings.latitude || !storeSettings.longitude) {
        throw new BadRequestException('Store settings must have latitude and longitude coordinates for 99minutos integration');
      }

      // For quote, we need items data - use cart if orderId provided, otherwise return error
      interface DeliveryQuoteItem {
        description: string;
        weight: number;
        length: number;
        width: number;
        height: number;
        quantity: number;
      }

      let items: DeliveryQuoteItem[] = [];
      if (data.orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: data.orderId },
          include: { items: { include: { product: true } } },
        });

        if (order && order.items) {
          items = order.items.map(item => ({
            description: item.productName,
            weight: item.product.weight || 0,
            length: item.product.length || 0,
            width: item.product.width || 0,
            height: item.product.height || 0,
            quantity: item.quantity,
          }));
        }
      }

      if (items.length === 0) {
        throw new BadRequestException('Quote requires order with items to calculate shipping cost');
      }

      // Check if customer address has coordinates (they don't in current schema)
      // For now, throw error since we can't geocode without integration
      throw new BadRequestException('99minutos integration requires geocoding. Customer addresses must have latitude and longitude coordinates, which is not currently supported. Please use PICKUP or MANUAL delivery methods instead.');
    }

    throw new BadRequestException('Unsupported delivery method');
  }

  async create(user: DeliveryUser, data: CreateDeliveryDto) {
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot create delivery records directly. The backend must manage the delivery flow.');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Access denied');
    }

    const order = await this.getOrderForDelivery(data.orderId, user);
    const payment = await this.prisma.payment.findUnique({ where: { orderId: order.id } });

    if (!payment || payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Delivery can only be created after payment is confirmed.');
    }

    const existing = await this.prisma.delivery.findUnique({ where: { orderId: data.orderId } });
    if (existing) {
      return existing;
    }

    this.ensureMethodAllowed(data.method);

    if (data.method === DeliveryMethod.PICKUP) {
      return this.prisma.delivery.create({
        data: {
          orderId: order.id,
          method: DeliveryMethod.PICKUP,
          provider: DeliveryProvider.NONE,
          shippingCost: 0,
          status: DeliveryStatus.READY_FOR_PICKUP,
        },
      });
    }

    if (data.method === DeliveryMethod.MANUAL) {
      return this.prisma.delivery.create({
        data: {
          orderId: order.id,
          method: DeliveryMethod.MANUAL,
          provider: DeliveryProvider.MANUAL,
          shippingCost: 0,
          status: DeliveryStatus.REQUESTING,
        },
      });
    }

    if (data.method === DeliveryMethod.UBER || data.method === DeliveryMethod.NINENINE) {
      const provider = data.method === DeliveryMethod.UBER ? DeliveryProvider.UBER : DeliveryProvider.NINENINE;

      return this.prisma.delivery.create({
        data: {
          orderId: order.id,
          method: data.method,
          provider,
          shippingCost: 0,
          status: DeliveryStatus.QUOTED,
        },
      });
    }

    throw new BadRequestException('Unsupported delivery method');
  }

  async authorize(user: DeliveryUser, id: string) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only ADMIN or OWNER can authorize a delivery');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { order: { include: { payment: true, items: { include: { product: true } } } } },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (!delivery.order || !delivery.order.payment) {
      throw new BadRequestException('Order payment is required before authorization');
    }

    if (delivery.order.payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Payment must be confirmed before authorization');
    }

    if (delivery.status !== DeliveryStatus.QUOTED) {
      throw new BadRequestException('Only quoted deliveries can be authorized');
    }

    const activeStatuses: DeliveryStatus[] = [
      DeliveryStatus.REQUESTING,
      DeliveryStatus.SEARCHING_DRIVER,
      DeliveryStatus.DRIVER_ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.DELIVERED,
    ];

    if (delivery.externalDeliveryId || activeStatuses.includes(delivery.status)) {
      throw new BadRequestException('Delivery was already requested to the provider or already in progress.');
    }

    if (delivery.method === DeliveryMethod.UBER) {
      try {
        const providerResult = await this.uberDirectService.createDelivery({
          deliveryId: delivery.id,
          orderId: delivery.orderId,
        });

        if (!providerResult.externalDeliveryId) {
          throw new BadRequestException('Uber did not return a valid external delivery ID.');
        }

        const updated = await this.prisma.delivery.update({
          where: { id },
          data: {
            status: DeliveryStatus.REQUESTING,
            externalDeliveryId: providerResult.externalDeliveryId,
            quoteId: providerResult.quoteId ?? delivery.quoteId,
            shippingCost: providerResult.shippingCost ?? delivery.shippingCost,
            estimatedDelivery: providerResult.estimatedDelivery ?? delivery.estimatedDelivery,
            requestedAt: new Date(),
          },
        });

        return {
          ok: true,
          deliveryId: updated.id,
          externalDeliveryId: updated.externalDeliveryId,
          status: updated.status,
        };
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          throw new BadRequestException('Uber Direct is not configured. Authorization is disabled until credentials are available.');
        }
        throw error;
      }
    }

    if (delivery.method === DeliveryMethod.NINENINE) {
      try {
        const storeSettings = await this.prisma.storeSettings.findFirst();
        if (!storeSettings) {
          throw new BadRequestException('Store settings are not configured');
        }

        // 99minutos requires coordinates but our Address model doesn't have them
        // For now, disable 99minutos integration until geocoding is implemented
        throw new BadRequestException('99minutos integration is currently disabled because the Address model does not support latitude/longitude coordinates. Please use PICKUP or MANUAL delivery methods instead, or implement geocoding to obtain address coordinates.');
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          throw new BadRequestException('99Entrega is not configured. Authorization is disabled until credentials are available.');
        }
        throw error;
      }
    }

    throw new BadRequestException('Only Uber and 99 deliveries can be authorized externally');
  }

  async getPendingAuthorization(user: DeliveryUser) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only ADMIN or OWNER can view pending deliveries');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        method: { in: [DeliveryMethod.UBER, DeliveryMethod.NINENINE] },
        status: DeliveryStatus.QUOTED,
        order: {
          payment: {
            status: PaymentStatus.PAID,
          },
        },
      },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    return deliveries.map((delivery) => this.buildPendingAuthorizationPayload(delivery));
  }

  async findAll(user: DeliveryUser) {
    const deliveries = await this.prisma.delivery.findMany({
      where: user.role === UserRole.CUSTOMER ? { order: { userId: user.id } } : undefined,
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      orderId: delivery.orderId,
      method: delivery.method,
      provider: delivery.provider,
      status: delivery.status,
      shippingCost: delivery.shippingCost,
      quoteId: delivery.quoteId,
      externalDeliveryId: delivery.externalDeliveryId,
      trackingCode: delivery.trackingCode,
      trackingUrl: delivery.trackingUrl,
      courierName: delivery.courierName,
      courierPhone: delivery.courierPhone,
      estimatedDelivery: delivery.estimatedDelivery,
      requestedAt: delivery.requestedAt,
      pickedUpAt: delivery.pickedUpAt,
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      order: delivery.order ? { id: delivery.order.id, number: delivery.order.number, userId: delivery.order.userId } : null,
    }));
  }

  async findOne(user: DeliveryUser, id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (user.role === UserRole.CUSTOMER && delivery.order.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return {
      id: delivery.id,
      orderId: delivery.orderId,
      method: delivery.method,
      provider: delivery.provider,
      status: delivery.status,
      shippingCost: delivery.shippingCost,
      quoteId: delivery.quoteId,
      externalDeliveryId: delivery.externalDeliveryId,
      trackingCode: delivery.trackingCode,
      trackingUrl: delivery.trackingUrl,
      courierName: delivery.courierName,
      courierPhone: delivery.courierPhone,
      estimatedDelivery: delivery.estimatedDelivery,
      requestedAt: delivery.requestedAt,
      pickedUpAt: delivery.pickedUpAt,
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }

  async update(user: DeliveryUser, id: string, data: UpdateDeliveryDto) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only ADMIN or OWNER can update delivery status');
    }

    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const status = data.status ?? delivery.status;
    this.ensureStatusTransition(delivery.status, status);

    const updateData: {
      status?: DeliveryStatus;
      courierName?: string | null;
      courierPhone?: string | null;
      trackingCode?: string | null;
      trackingUrl?: string | null;
      estimatedDelivery?: Date | null;
    } = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.courierName !== undefined) updateData.courierName = data.courierName;
    if (data.courierPhone !== undefined) updateData.courierPhone = data.courierPhone;
    if (data.trackingCode !== undefined) updateData.trackingCode = data.trackingCode;
    if (data.trackingUrl !== undefined) updateData.trackingUrl = data.trackingUrl;
    if (data.estimatedDelivery !== undefined) updateData.estimatedDelivery = new Date(data.estimatedDelivery);

    return this.prisma.delivery.update({ where: { id }, data: updateData });
  }

  async remove(user: DeliveryUser, id: string) {
    void user;
    void id;
    throw new ForbiddenException('Deliveries are historical records and cannot be deleted.');
  }

  async handleUberWebhook(rawBody: unknown, headers: Record<string, string | string[] | undefined> = {}) {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {});

    if (!this.uberDirectService.validateWebhook(text, headers)) {
      throw new ForbiddenException('Invalid Uber webhook signature');
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = payload && typeof payload === 'object' ? (payload as { event_id?: string; eventId?: string; id?: string }).event_id ?? (payload as { event_id?: string; eventId?: string; id?: string }).eventId ?? (payload as { event_id?: string; eventId?: string; id?: string }).id : undefined;
    const status = payload && typeof payload === 'object' ? (payload as { meta?: { status?: string }; status?: string }).meta?.status ?? (payload as { meta?: { status?: string }; status?: string }).status : undefined;

    if (!eventId || !status) {
      throw new BadRequestException('Invalid Uber webhook payload');
    }

    return { ok: true, provider: 'UBER', eventId, status };
  }

  async handleNinetyNineWebhook(rawBody: unknown, headers: Record<string, string | string[] | undefined> = {}) {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {});

    if (!this.ninetyNineService.validateWebhook(text, headers)) {
      throw new ForbiddenException('Invalid 99 webhook signature');
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    
    const normalized = this.ninetyNineService.normalizeWebhookPayload(payload);
    
    if (!normalized) {
      throw new BadRequestException('Invalid 99 webhook payload');
    }

    const { trackingId, statusCode, statusName, eventTime } = normalized;

    const delivery = await this.prisma.delivery.findFirst({
      where: {
        externalDeliveryId: trackingId,
        provider: DeliveryProvider.NINENINE,
      },
      include: { order: true },
    });

    if (!delivery) {
      this.logger.warn(`99 webhook received for unknown delivery: ${trackingId}`);
      return { ok: true, provider: 'NINENINE', trackingId, message: 'Delivery not found' };
    }

    const newStatus = this.mapNinetyNineStatusToDeliveryStatus(statusCode, statusName);
    
    if (!newStatus) {
      this.logger.warn(`99 webhook received with unmapped status: ${statusCode} (${statusName})`);
      return { ok: true, provider: 'NINENINE', trackingId, status: delivery.status };
    }

    // Prevent status regression
    if (this.shouldRejectStatusRegression(delivery.status, newStatus)) {
      this.logger.warn(`99 webhook rejected status regression: ${delivery.status} -> ${newStatus}`);
      return { ok: true, provider: 'NINENINE', trackingId, status: delivery.status, message: 'Status regression rejected' };
    }

    // Only update if status is different
    if (newStatus !== delivery.status) {
      this.ensureStatusTransition(delivery.status, newStatus);
      
      await this.prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: newStatus,
        },
      });
    }

    return { ok: true, provider: 'NINENINE', trackingId, status: newStatus };
  }

  private shouldRejectStatusRegression(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean {
    // Define status precedence (higher value = more advanced)
    const statusPrecedence: Record<DeliveryStatus, number> = {
      [DeliveryStatus.PENDING]: 0,
      [DeliveryStatus.QUOTED]: 1,
      [DeliveryStatus.REQUESTING]: 2,
      [DeliveryStatus.SEARCHING_DRIVER]: 3,
      [DeliveryStatus.DRIVER_ASSIGNED]: 4,
      [DeliveryStatus.PICKED_UP]: 5,
      [DeliveryStatus.IN_TRANSIT]: 6,
      [DeliveryStatus.DELIVERED]: 7,
      [DeliveryStatus.FAILED]: 8,
      [DeliveryStatus.CANCELLED]: 9,
      [DeliveryStatus.READY_FOR_PICKUP]: 10,
    };

    const currentPrecedence = statusPrecedence[currentStatus] || 0;
    const newPrecedence = statusPrecedence[newStatus] || 0;

    // Reject if new status has lower precedence (regression)
    // Exception: FAILED and CANCELLED can always be set (they are terminal states)
    if (newStatus === DeliveryStatus.FAILED || newStatus === DeliveryStatus.CANCELLED) {
      return false;
    }

    return newPrecedence < currentPrecedence;
  }

  private mapNinetyNineStatusToDeliveryStatus(statusCode: string, statusName: string): DeliveryStatus | null {
    const statusMap: Record<string, DeliveryStatus> = {
      '1001': DeliveryStatus.QUOTED, // DRAFT
      '1002': DeliveryStatus.REQUESTING, // CONFIRMED
      '2001': DeliveryStatus.REQUESTING, // PARA RECOGER
      '2002': DeliveryStatus.SEARCHING_DRIVER, // CONDUCTOR ASIGNADO PARA RECOGER
      '2003': DeliveryStatus.DRIVER_ASSIGNED, // RECOGIDA CONFIRMADA
      '2101': DeliveryStatus.FAILED, // RECOGIDA FALLIDA
      '3001': DeliveryStatus.IN_TRANSIT, // EN ALMACÉN
      '3004': DeliveryStatus.IN_TRANSIT, // SE HA SOLICITADO UNA TRANSFERENCIA
      '4001': DeliveryStatus.IN_TRANSIT, // ON ROAD TO DELIVERY
      '4002': DeliveryStatus.DELIVERED, // DELIVERED
      '4101': DeliveryStatus.FAILED, // UNSUCCESSFUL DELIVERY
      '5001': DeliveryStatus.FAILED, // ON ROAD TO RETURN
      '5002': DeliveryStatus.FAILED, // RETURNED
      '5101': DeliveryStatus.FAILED, // UNSUCCESSFUL RETURN
      '7101': DeliveryStatus.FAILED, // IN CORRECTION
      '8001': DeliveryStatus.FAILED, // STOLEN
      '8003': DeliveryStatus.CANCELLED, // CANCELLED
      '8004': DeliveryStatus.FAILED, // DAMAGED
    };

    return statusMap[statusCode] || null;
  }
}
