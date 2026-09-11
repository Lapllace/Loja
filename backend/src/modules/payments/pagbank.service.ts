import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class PagBankService {
  constructor(private readonly config: ConfigService) {}

  private getApiUrl(): string {
    return this.config.get<string>('PAGBANK_API_URL', 'https://sandbox.api.pagseguro.com');
  }

  private getApiToken(): string | undefined {
    return this.config.get<string>('PAGBANK_API_TOKEN');
  }

  private getWebhookToken(): string | undefined {
    return this.config.get<string>('PAGBANK_WEBHOOK_TOKEN');
  }

  private getReturnUrl(): string | undefined {
    return this.config.get<string>('PAGBANK_CHECKOUT_RETURN_URL');
  }

  isWebhookTokenConfigured(): boolean {
    return Boolean(this.getWebhookToken());
  }

  private ensureConfigured(): void {
    if (!this.getApiToken()) {
      throw new ServiceUnavailableException('PagBank API token is not configured');
    }
  }

  async createPixCheckout(order: any, payment: any) {
    this.ensureConfigured();

    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      throw new BadRequestException('Order has no items to create a PagBank checkout');
    }

    const expectedTotalCents = order.items.reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity ?? 1);
      const unitValue = Number(item.price ?? item.unit_price ?? 0);
      const unitAmountCents = Math.round(unitValue * 100);
      return sum + unitAmountCents * quantity;
    }, 0);

    const orderTotalCents = Math.round(Number(order.total ?? 0) * 100);
    if (!Number.isFinite(expectedTotalCents) || expectedTotalCents <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    if (expectedTotalCents !== orderTotalCents) {
      throw new BadRequestException('Order total does not match the calculated checkout total');
    }

    const referenceId = `order-${order.number ?? order.id}`;
    const payload = {
      reference_id: referenceId,
      customer: {
        name: order.user?.name ?? 'Cliente Loja',
        email: order.user?.email ?? 'cliente@loja.local',
      },
      items: (order.items ?? []).map((item: any) => ({
        name: item.productName || item.product?.name || 'Produto',
        quantity: Number(item.quantity ?? 1),
        unit_amount: Math.round(Number(item.price ?? item.unit_price ?? 0) * 100),
      })),
      payment_methods: [{ type: 'PIX' }],
      notification_urls: [
        `${this.config.get<string>('APP_URL', 'http://localhost:3000')}/api/payments/webhooks/pagbank`,
      ],
      return_url: this.getReturnUrl() ?? `${this.config.get<string>('APP_URL', 'http://localhost:3000')}/checkout/return`,
      amount: {
        value: expectedTotalCents,
        currency: 'BRL',
        summary: {
          shipping: 0,
          discount: 0,
          additional: 0,
        },
      },
    };

    const response = await fetch(`${this.getApiUrl().replace(/\/$/, '')}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getApiToken()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`PagBank checkout request failed: ${detail}`);
    }

    const data = (await response.json()) as any;
    const externalTransactionId = data?.id ?? data?.transaction_id ?? data?.transactionId ?? data?.payment?.id ?? null;
    if (!externalTransactionId) {
      throw new ServiceUnavailableException('PagBank checkout did not return a valid external transaction id');
    }

    const checkoutUrl = data?.links?.find((link: any) => link?.rel === 'PAY')?.href ?? data?.payment_url ?? null;
    const pixQrCode = data?.pix?.qr_code ?? data?.qr_code ?? null;
    const pixCopyPaste = data?.pix?.copy_paste ?? data?.copy_paste ?? null;
    const expiresAt = data?.expiration_date ?? data?.expires_at ?? null;

    return {
      provider: 'PAGBANK',
      transactionId: String(externalTransactionId),
      checkoutUrl,
      pixQrCode,
      pixCopyPaste,
      expiresAt,
      referenceId,
      raw: data,
    };
  }

  async getCheckoutStatus(checkoutId: string) {
    this.ensureConfigured();

    const response = await fetch(`${this.getApiUrl().replace(/\/$/, '')}/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.getApiToken()}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`PagBank checkout lookup failed: ${detail}`);
    }

    return response.json();
  }

  validateWebhookToken(headers: Record<string, any> | undefined, rawBody: unknown): boolean {
    const webhookToken = this.getWebhookToken();
    if (!webhookToken) {
      return false;
    }

    const authenticityHeader = headers?.['x-authenticity-token'] ?? headers?.['x-authenticityToken'];
    if (!authenticityHeader) {
      return false;
    }

    const rawPayload = typeof rawBody === 'string' ? rawBody : Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody ?? {});
    const expectedHash = createHash('sha256').update(`${webhookToken}-${rawPayload}`).digest('hex');
    const providedHash = Array.isArray(authenticityHeader) ? String(authenticityHeader[0]).trim() : String(authenticityHeader).trim();

    if (providedHash.length !== 64) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const providedBuffer = Buffer.from(providedHash.toLowerCase(), 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }
}
