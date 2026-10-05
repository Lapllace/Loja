import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  MetaWaErrorResponse,
  MetaWaSuccessResponse,
  MetaWaTemplatePayload,
  MetaWaTextPayload,
  SendResult,
  TemplateParams,
} from './types';
import { sanitizePhone } from './phone.util';

/** Tempo máximo para a resposta da API antes de desistir. */
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Serviço de envio de mensagens WhatsApp via Meta Cloud API.
 *
 * TOLERANTE À AUSÊNCIA DE CREDENCIAIS: quando `META_WA_PHONE_NUMBER_ID` ou
 * `META_WA_ACCESS_TOKEN` não estiverem configurados, os métodos retornam
 * `{ ok: false }` com log informativo — sem lançar exceções — de forma que os
 * fluxos de pedido/pagamento não sejam interrompidos.
 */
@Injectable()
export class MetaWhatsappService {
  private readonly logger = new Logger(MetaWhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  // ── Credenciais ─────────────────────────────────────────────────────────────

  private get phoneNumberId(): string | undefined {
    return this.config.get<string>('META_WA_PHONE_NUMBER_ID');
  }

  private get accessToken(): string | undefined {
    return this.config.get<string>('META_WA_ACCESS_TOKEN');
  }

  private get graphApiVersion(): string {
    return this.config.get<string>('META_WA_GRAPH_API_VERSION', 'v21.0');
  }

  private get graphApiBase(): string {
    return `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  /**
   * Verifica se as credenciais estão presentes.
   * Loga um aviso único (não um erro) quando ausentes — intencionalmente
   * verboso para facilitar o diagnóstico em produção.
   */
  private isConfigured(): boolean {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'WhatsApp notifications disabled: META_WA_PHONE_NUMBER_ID or ' +
          'META_WA_ACCESS_TOKEN not set in environment variables.',
      );
      return false;
    }
    return true;
  }

  // ── Primitivos de envio ─────────────────────────────────────────────────────

  /**
   * Envia uma mensagem de texto livre para `to`.
   *
   * @param to   Número do destinatário (qualquer formato; será sanitizado).
   * @param body Texto da mensagem (até 4096 caracteres).
   */
  async sendTextMessage(to: string, body: string): Promise<SendResult> {
    if (!this.isConfigured()) return { ok: false, reason: 'not_configured' };

    const phone = sanitizePhone(to);
    if (!phone) {
      this.logger.warn(
        `WhatsApp: invalid phone number "${to}" — message skipped.`,
      );
      return { ok: false, reason: 'invalid_phone' };
    }

    const payload: MetaWaTextPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body },
    };

    return this.post(payload);
  }

  /**
   * Envia uma mensagem baseada em template aprovado no Meta Business.
   *
   * @param to     Número do destinatário (qualquer formato; será sanitizado).
   * @param params Parâmetros do template (nome, idioma, variáveis do corpo).
   */
  async sendTemplateMessage(
    to: string,
    params: TemplateParams,
  ): Promise<SendResult> {
    if (!this.isConfigured()) return { ok: false, reason: 'not_configured' };

    const phone = sanitizePhone(to);
    if (!phone) {
      this.logger.warn(
        `WhatsApp: invalid phone number "${to}" — template skipped.`,
      );
      return { ok: false, reason: 'invalid_phone' };
    }

    const payload: MetaWaTemplatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: params.name,
        language: { code: params.languageCode ?? 'pt_BR' },
        ...(params.bodyParams && params.bodyParams.length > 0
          ? {
              components: [
                {
                  type: 'body' as const,
                  parameters: params.bodyParams.map((text) => ({
                    type: 'text' as const,
                    text,
                  })),
                },
              ],
            }
          : {}),
      },
    };

    return this.post(payload);
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────

  private async post(
    payload: MetaWaTextPayload | MetaWaTemplatePayload,
  ): Promise<SendResult> {
    const url = `${this.graphApiBase}/${this.phoneNumberId}/messages`;

    try {
      const response = await axios.post<MetaWaSuccessResponse>(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      });

      const messageId = response.data?.messages?.[0]?.id ?? 'unknown';
      this.logger.debug(
        `WhatsApp message sent — to: ${payload.to}, messageId: ${messageId}`,
      );
      return { ok: true, messageId };
    } catch (err) {
      const message = this.extractErrorMessage(err);
      // Erros da API são warnings, não erros críticos — o pedido já foi criado.
      this.logger.warn(`WhatsApp send failed — to: ${payload.to} — ${message}`);
      return { ok: false, reason: message };
    }
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as MetaWaErrorResponse | undefined;
      if (data?.error?.message) return data.error.message;
      if (err.code === 'ECONNABORTED') return 'timeout';
      return err.message;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
