import { Injectable, ServiceUnavailableException, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus } from '@prisma/client';

export interface DeliveryProviderResult {
  externalDeliveryId: string | null;
  quoteId: string | null;
  shippingCost: number | null;
  estimatedDelivery: Date | null;
  expiresAt: Date | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  courierName: string | null;
  courierPhone: string | null;
  status?: string;
}

export interface NinetyNineQuoteResult {
  quoteId: string | null;
  shippingCost: number;
  estimatedDelivery: Date | null;
  expiresAt: Date | null;
}

export interface NinetyNineCreateDeliveryResult {
  externalDeliveryId: string;
  status: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
}

export interface NinetyNineQuoteRequest {
  pickup: {
    address: {
      recipient: string;
      phone: string;
      email: string;
      zipcode: string;
      street: string;
      number: string;
      complement: string | null;
      district: string;
      city: string;
      state: string;
      reference: string | null;
      lat: number;
      lng: number;
    };
  };
  dropoff: {
    address: {
      recipient: string;
      phone: string;
      email: string;
      zipcode: string;
      street: string;
      number: string;
      complement: string | null;
      district: string;
      city: string;
      state: string;
      reference: string | null;
      lat: number;
      lng: number;
    };
  };
  items: Array<{
    description: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity: number;
  }>;
  vehicleType?: string;
}

export interface NinetyNineCreateDeliveryRequest {
  deliveryId: string;
  storeSettings: {
    name: string;
    phone: string | null;
    email: string | null;
    zipcode: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    reference: string | null;
    lat: number | null;
    lng: number | null;
  };
  order: {
    shippingRecipient: string;
    shippingPhone: string | null;
    shippingEmail: string | null;
    shippingZipcode: string;
    shippingStreet: string;
    shippingNumber: string;
    shippingComplement: string | null;
    shippingDistrict: string;
    shippingCity: string;
    shippingState: string;
    shippingReference: string | null;
    shippingLat: number | null;
    shippingLng: number | null;
  };
  items: Array<{
    description: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity: number;
  }>;
  vehicleType?: string;
}

export interface NinetyNineTrackingResult {
  externalDeliveryId: string;
  status: DeliveryStatus;
  trackingCode: string | null;
  trackingUrl: string | null;
  courierName: string | null;
  courierPhone: string | null;
  estimatedDelivery: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
}

export interface NinetyNineWebhookNormalized {
  trackingId: string;
  internalKey: string | null;
  statusCode: string;
  statusName: string;
  eventTime: Date | null;
}

interface OAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface RatesResponse {
  data?: {
    totalCost?: number;
    serviceLevels?: string[];
  };
  totalCost?: number;
  serviceLevels?: string[];
}

interface CreateOrderRequest {
  shipments: Array<{
    internalKey: string;
    deliveryType: string;
    sender: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
    };
    recipient: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
    };
    origin: {
      address: string;
      country: string;
      city: string;
      zipcode: string;
      reference?: string;
    };
    destination: {
      address: string;
      country: string;
      city: string;
      zipcode: string;
      reference?: string;
    };
    payments: {
      paymentMethod: string;
    };
    items: Array<{
      size: string;
      description: string;
      weight: number;
      length: number;
      width: number;
      height: number;
    }>;
  }>;
  draft: boolean;
}

interface CreateOrderResponse {
  _id: string;
  shipments: Array<{
    trackingId: string;
    internalKey: string;
  }>;
}

interface TrackingResponse {
  StatusCode: string;
  StatusName: string;
  TrackingId: string;
  InternalKey: string;
  Events: Array<{
    StatusCode: string;
    StatusName: string;
    CreatedAt: string;
    Data?: {
      comment?: string;
      driverName?: string;
      driverPhone?: string;
    };
  }>;
}

@Injectable()
export class NinetyNineService {
  private readonly logger = new Logger(NinetyNineService.name);
  private tokenCache: { token: string; expiresAt: Date } | null = null;

  constructor(private readonly config: ConfigService) {}

  private getApiUrl(): string {
    const environment = this.config.get<string>('NINENINE_ENVIRONMENT', 'sandbox');
    return environment === 'production' 
      ? 'https://delivery.99minutos.com' 
      : 'https://sandbox.99minutos.com';
  }

  private getClientId(): string | undefined {
    return this.config.get<string>('NINENINE_CLIENT_ID');
  }

  private getClientSecret(): string | undefined {
    return this.config.get<string>('NINENINE_CLIENT_SECRET');
  }

  private getWebhookSecret(): string | undefined {
    return this.config.get<string>('NINENINE_WEBHOOK_SECRET');
  }

  private ensureConfigured(): void {
    if (!this.getClientId() || !this.getClientSecret()) {
      throw new ServiceUnavailableException('99Entrega credentials are not configured. Integration is ready but disabled until official credentials are provided.');
    }
  }

  private async getAccessToken(): Promise<string> {
    this.ensureConfigured();

    if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
      return this.tokenCache.token;
    }

    try {
      const response = await fetch(`${this.getApiUrl()}/api/v3/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.getClientId(),
          client_secret: this.getClientSecret(),
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth request failed: ${response.status}`);
      }

      const data: OAuthResponse = await response.json();
      const expiresIn = data.expires_in;
      
      this.tokenCache = {
        token: data.access_token,
        expiresAt: new Date(Date.now() + (expiresIn - 60) * 1000), // Refresh 1 minute before expiry
      };

      return this.tokenCache.token;
    } catch (error) {
      this.logger.error('Failed to obtain 99minutos access token', error);
      throw new ServiceUnavailableException('Failed to authenticate with 99minutos API');
    }
  }

  private async makeAuthenticatedRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    data?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`99minutos API request failed: ${method} ${url}`, error);
      throw new ServiceUnavailableException('99minutos API request failed');
    }
  }

  private calculatePackageDimensions(items: NinetyNineQuoteRequest['items']): { weight: number; length: number; width: number; height: number } {
    if (items.length === 0) {
      throw new BadRequestException('Cannot calculate package dimensions: no items provided');
    }

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

    // Use maximum dimensions across all items (conservative approach)
    const maxLength = Math.max(...items.map(item => item.length));
    const maxWidth = Math.max(...items.map(item => item.width));
    const maxHeight = Math.max(...items.map(item => item.height));

    return {
      weight: totalWeight,
      length: maxLength,
      width: maxWidth,
      height: maxHeight,
    };
  }

  private determinePackageSize(dimensions: { weight: number; length: number; width: number; height: number }): string {
    // 99minutos size categories: xs, s, m, l, xl
    // Based on documentation, determine size by volume (length * width * height in cm³)
    const volume = dimensions.length * dimensions.width * dimensions.height;
    
    // Volume thresholds in cm³:
    // xs: < 1,000 cm³ (e.g., 10x10x10)
    // s: 1,000 - 4,999 cm³ (e.g., 15x15x15 = 3,375)
    // m: 5,000 - 14,999 cm³ (e.g., 25x25x25 = 15,625)
    // l: 15,000 - 29,999 cm³ (e.g., 30x30x30 = 27,000)
    // xl: >= 30,000 cm³ (e.g., 35x35x35 = 42,875)
    
    if (volume < 1000) return 'xs';
    if (volume < 5000) return 's';
    if (volume < 15000) return 'm';
    if (volume < 30000) return 'l';
    return 'xl';
  }

  private formatCoordinate(value: number): string {
    return value.toFixed(6);
  }

  private mapNinetyNineStatusToDeliveryStatus(statusCode: string, statusName: string): DeliveryStatus {
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

    return statusMap[statusCode] || DeliveryStatus.FAILED;
  }

  async quoteDelivery(payload: NinetyNineQuoteRequest): Promise<NinetyNineQuoteResult> {
    this.ensureConfigured();

    const { pickup, dropoff, items, vehicleType } = payload;
    
    if (!pickup.address || !dropoff.address) {
      throw new BadRequestException('Invalid quote request: missing addresses');
    }

    if (!pickup.address.lat || !pickup.address.lng || !dropoff.address.lat || !dropoff.address.lng) {
      throw new BadRequestException('Invalid quote request: missing coordinates for 99minutos API. Addresses must be geocoded.');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Invalid quote request: no items provided');
    }

    // Validate items have required dimensions
    for (const item of items) {
      if (!item.weight || !item.length || !item.width || !item.height) {
        throw new BadRequestException('Invalid quote request: items must have weight, length, width, and height');
      }
    }

    try {
      const packageDimensions = this.calculatePackageDimensions(items);
      const packageSize = this.determinePackageSize(packageDimensions);

      const response: RatesResponse = await this.makeAuthenticatedRequest<RatesResponse>(
        `${this.getApiUrl()}/api/v3/shipping/rates/coordinates/BRA/${this.formatCoordinate(pickup.address.lat)}/${this.formatCoordinate(pickup.address.lng)}/BRA/${this.formatCoordinate(dropoff.address.lat)}/${this.formatCoordinate(dropoff.address.lng)}`,
        'GET',
        null
      );

      // Parse shipping cost from response - do not fallback to zero
      let shippingCost: number;
      if (response.data?.totalCost !== undefined) {
        shippingCost = response.data.totalCost;
      } else if (response.totalCost !== undefined) {
        shippingCost = response.totalCost;
      } else {
        throw new ServiceUnavailableException('99minutos API did not return a valid shipping cost');
      }

      const result: NinetyNineQuoteResult = {
        quoteId: null, // API does not provide a reusable quote ID
        shippingCost,
        estimatedDelivery: null, // API does not provide ETA in rates endpoint
        expiresAt: null, // API does not provide expiration
      };

      return result;
    } catch (error) {
      this.logger.error('99minutos quote request failed', error);
      throw new ServiceUnavailableException('99minutos quote request failed. Ensure coordinates are valid and service is available for the route.');
    }
  }

  async createDelivery(payload: NinetyNineCreateDeliveryRequest): Promise<NinetyNineCreateDeliveryResult> {
    this.ensureConfigured();

    const { deliveryId, storeSettings, order, items, vehicleType } = payload;

    if (!storeSettings.lat || !storeSettings.lng) {
      throw new BadRequestException('Store settings must have latitude and longitude coordinates for 99minutos integration');
    }

    if (!order.shippingLat || !order.shippingLng) {
      throw new BadRequestException('Order shipping address must have latitude and longitude coordinates for 99minutos integration');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Cannot create delivery: no items provided');
    }

    // Validate items have required dimensions
    for (const item of items) {
      if (!item.weight || !item.length || !item.width || !item.height) {
        throw new BadRequestException('Cannot create delivery: items must have weight, length, width, and height');
      }
    }

    const packageDimensions = this.calculatePackageDimensions(items);
    const packageSize = this.determinePackageSize(packageDimensions);

    // Parse names for sender/recipient
    const storeNameParts = storeSettings.name.split(' ');
    const storeFirstName = storeNameParts[0] || 'Loja';
    const storeLastName = storeNameParts.slice(1).join(' ') || 'Owner';

    const recipientNameParts = order.shippingRecipient.split(' ');
    const recipientFirstName = recipientNameParts[0] || 'Customer';
    const recipientLastName = recipientNameParts.slice(1).join(' ') || 'Name';

    const storePhone = storeSettings.phone;
    const storeEmail = storeSettings.email;
    
    const recipientPhone = order.shippingPhone;
    const recipientEmail = order.shippingEmail;

    // Validate required fields
    if (!storePhone) {
      throw new BadRequestException('Store settings must have a phone number for 99minutos integration');
    }
    if (!storeEmail) {
      throw new BadRequestException('Store settings must have an email for 99minutos integration');
    }
    if (!recipientPhone) {
      throw new BadRequestException('Customer must have a phone number for 99minutos integration');
    }
    if (!recipientEmail) {
      throw new BadRequestException('Customer must have an email for 99minutos integration');
    }

    // Build address strings
    const pickupAddress = `${storeSettings.street}, ${storeSettings.number}${storeSettings.complement ? ' ' + storeSettings.complement : ''}, ${storeSettings.district}, ${storeSettings.city} - ${storeSettings.state}, ${storeSettings.zipcode}`;
    const dropoffAddress = `${order.shippingStreet}, ${order.shippingNumber}${order.shippingComplement ? ' ' + order.shippingComplement : ''}, ${order.shippingDistrict}, ${order.shippingCity} - ${order.shippingState}, ${order.shippingZipcode}`;

    const orderRequest: CreateOrderRequest = {
      shipments: [
        {
          internalKey: deliveryId,
          deliveryType: vehicleType || 'SPT',
          sender: {
            firstName: storeFirstName,
            lastName: storeLastName,
            phone: storePhone,
            email: storeEmail,
          },
          recipient: {
            firstName: recipientFirstName,
            lastName: recipientLastName,
            phone: recipientPhone,
            email: recipientEmail,
          },
          origin: {
            address: pickupAddress,
            country: 'BRA',
            city: storeSettings.city,
            zipcode: storeSettings.zipcode,
            reference: storeSettings.reference || undefined,
          },
          destination: {
            address: dropoffAddress,
            country: 'BRA',
            city: order.shippingCity,
            zipcode: order.shippingZipcode,
            reference: order.shippingReference || undefined,
          },
          payments: {
            paymentMethod: 'cash',
          },
          items: [
            {
              size: packageSize,
              description: items.map(item => item.description).join(', '),
              weight: packageDimensions.weight,
              length: packageDimensions.length,
              width: packageDimensions.width,
              height: packageDimensions.height,
            },
          ],
        },
      ],
      draft: false, // Create confirmed order directly
    };

    try {
      const response: CreateOrderResponse = await this.makeAuthenticatedRequest<CreateOrderResponse>(
        `${this.getApiUrl()}/api/v3/orders`,
        'POST',
        orderRequest
      );

      const shipment = response.shipments[0];
      if (!shipment || !shipment.trackingId) {
        throw new ServiceUnavailableException('99minutos API did not return a valid tracking ID');
      }

      const result: NinetyNineCreateDeliveryResult = {
        externalDeliveryId: shipment.trackingId,
        status: 'REQUESTING',
      };

      return result;
    } catch (error) {
      // Only convert unknown errors to ServiceUnavailableException
      // Preserve domain errors (BadRequestException, etc.)
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('99minutos create delivery request failed', error);
      throw new ServiceUnavailableException('99minutos create delivery request failed');
    }
  }

  async getDeliveryStatus(externalDeliveryId: string): Promise<NinetyNineTrackingResult> {
    this.ensureConfigured();

    try {
      const response: TrackingResponse = await this.makeAuthenticatedRequest<TrackingResponse>(
        `${this.getApiUrl()}/api/v3/shipments/tracking/${externalDeliveryId}`,
        'GET',
        null
      );

      const latestEvent = response.Events[response.Events.length - 1];
      
      const timestamp = latestEvent?.CreatedAt ?? null;
      const eventTime = timestamp && !Number.isNaN(Date.parse(timestamp)) ? new Date(timestamp) : null;
      
      const result: NinetyNineTrackingResult = {
        externalDeliveryId: response.TrackingId,
        status: this.mapNinetyNineStatusToDeliveryStatus(response.StatusCode, response.StatusName),
        trackingCode: response.TrackingId,
        trackingUrl: null,
        courierName: latestEvent?.Data?.driverName || null,
        courierPhone: latestEvent?.Data?.driverPhone || null,
        estimatedDelivery: null,
        pickedUpAt: response.StatusCode === '2003' ? eventTime : null,
        deliveredAt: response.StatusCode === '4002' ? eventTime : null,
      };

      return result;
    } catch (error) {
      this.logger.error('99minutos get delivery status request failed', error);
      throw new ServiceUnavailableException('99minutos get delivery status request failed');
    }
  }

  async cancelDelivery(externalDeliveryId: string): Promise<{ externalDeliveryId: string | null }> {
    this.ensureConfigured();

    try {
      await this.makeAuthenticatedRequest(
        `${this.getApiUrl()}/api/v3/shipments/${externalDeliveryId}`,
        'DELETE',
        null
      );

      return { externalDeliveryId };
    } catch (error) {
      this.logger.error('99minutos cancel delivery request failed', error);
      throw new ServiceUnavailableException('99minutos cancel delivery request failed');
    }
  }

  normalizeWebhookPayload(rawPayload: unknown): NinetyNineWebhookNormalized | null {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return null;
    }

    const payload = rawPayload as Record<string, unknown>;
    const trackingId = payload.TrackingId || payload.trackingId;
    const internalKey = payload.InternalKey || payload.internalKey;
    const statusCode = payload.StatusCode || payload.statusCode;
    const statusName = payload.StatusName || payload.statusName;
    
    // Try to get event time from latest event or payload
    let eventTime: Date | null = null;
    const events = payload.Events as Array<{ CreatedAt?: string }> | undefined;
    if (events && Array.isArray(events) && events.length > 0) {
      const latestEvent = events[events.length - 1];
      const timestamp = latestEvent?.CreatedAt ?? null;
      if (timestamp && !Number.isNaN(Date.parse(timestamp))) {
        eventTime = new Date(timestamp);
      }
    }

    if (!trackingId || !statusCode) {
      return null;
    }

    return {
      trackingId: String(trackingId),
      internalKey: internalKey ? String(internalKey) : null,
      statusCode: String(statusCode),
      statusName: statusName ? String(statusName) : '',
      eventTime,
    };
  }

  validateWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined> = {}): boolean {
    const secret = this.getWebhookSecret();
    if (!secret) {
      return false;
    }

    // 99minutos webhook signature header - only accept the official header
    const provided = headers['x-99minutos-signature'];

    if (!provided) {
      return false;
    }

    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
    
    try {
      const providedString = Array.isArray(provided) ? provided[0] : String(provided);
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedString.trim()));
    } catch (error) {
      return false;
    }
  }
}