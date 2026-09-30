/**
 * Tipos internos do módulo de notificações via WhatsApp (Meta Cloud API).
 *
 * Modelados a partir da especificação pública:
 * https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

// ─── Payload enviado à API ────────────────────────────────────────────────────

export interface MetaWaTextPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url: boolean;
    body: string;
  };
}

export interface MetaWaTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface MetaWaTemplatePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: MetaWaTemplateComponent[];
  };
}

// ─── Respostas da API ─────────────────────────────────────────────────────────

export interface MetaWaSuccessResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface MetaWaErrorDetail {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export interface MetaWaErrorResponse {
  error: MetaWaErrorDetail;
}

// ─── Resultado interno ────────────────────────────────────────────────────────

export type SendResult =
  { ok: true; messageId: string } | { ok: false; reason: string };

// ─── Parâmetros de template ───────────────────────────────────────────────────

export interface TemplateParams {
  /** Nome do template aprovado no Meta Business. */
  name: string;
  /** Código de idioma (ex: 'pt_BR'). Default: 'pt_BR'. */
  languageCode?: string;
  /** Parâmetros de texto para os componentes do corpo. */
  bodyParams?: string[];
}
