import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DeliveryProviderResult {
  externalDeliveryId: string | null;
  quoteId?: string | null;
  shippingCost?: number | null;
  estimatedDelivery?: Date | null;
  expiresAt?: Date | null;
}

@Injectable()
export class UberDirectService {
  constructor(private readonly config: ConfigService) {}

  private getApiUrl(): string | undefined {
    return this.config.get<string>('UBER_API_URL');
  }

  private getClientId(): string | undefined {
    return this.config.get<string>('UBER_CLIENT_ID');
  }

  private getClientSecret(): string | undefined {
    return this.config.get<string>('UBER_CLIENT_SECRET');
  }

  private getAccessToken(): string | undefined {
    return this.config.get<string>('UBER_ACCESS_TOKEN');
  }

  private getWebhookSecret(): string | undefined {
    return this.config.get<string>('UBER_WEBHOOK_SECRET');
  }

  private ensureConfigured(): void {
    const missing = [
      this.getApiUrl(),
      this.getClientId(),
      this.getClientSecret(),
      this.getAccessToken(),
    ].filter((value) => !value);

    if (missing.length > 0) {
      throw new ServiceUnavailableException('Uber Direct credentials are not configured. Integration is ready but disabled until official credentials are provided.');
    }
  }

  async quoteDelivery(payload: Record<string, unknown>): Promise<DeliveryProviderResult> {
    this.ensureConfigured();
    throw new ServiceUnavailableException('Uber Direct quote flow is not enabled without the official current API contract and valid credentials.');
  }

  async createDelivery(payload: Record<string, unknown>): Promise<DeliveryProviderResult> {
    this.ensureConfigured();
    throw new ServiceUnavailableException('Uber Direct delivery creation is not enabled without the official current API contract and valid credentials.');
  }

  async getDeliveryStatus(externalDeliveryId: string): Promise<{ externalDeliveryId: string | null }> {
    this.ensureConfigured();
    throw new ServiceUnavailableException('Uber Direct status lookup is not enabled without the official current API contract and valid credentials.');
  }

  validateWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined> = {}) {
    const secret = this.getWebhookSecret();
    if (!secret) {
      return false;
    }

    const provided =
      headers['x-uber-signature'] ??
      headers['x-uber-webhook-signature'] ??
      headers['x-signature'] ??
      headers['x-webhook-signature'];

    if (!provided) {
      return false;
    }

    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(provided).trim()));
  }
}
