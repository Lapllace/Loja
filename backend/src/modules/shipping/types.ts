/**
 * Opção de frete normalizada, no formato devolvido por POST /shipping/calculate.
 *
 * `isLocal` marca a opção própria da loja (Feira de Santana), que não vem do
 * SuperFrete e portanto não depende do token/da rede.
 */
export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  /** Prazo em dias úteis. `null` quando a transportadora não informa. */
  deliveryDays: number | null;
  isLocal?: boolean;
}

export type ShippingQuoteSource = 'superfrete' | 'fallback';

export interface ShippingQuoteResult {
  options: ShippingOption[];
  /** Qual origem produziu as opções (diagnóstico/telemetria). */
  source: ShippingQuoteSource;
}

/** Pacote montado a partir dos produtos (peso/dimensões aplicam os mínimos). */
export interface ShippingPackage {
  weight: number;
  height: number;
  width: number;
  length: number;
}

/**
 * Resposta da API v2 do SuperFrete (parser tolerante).
 *
 * O contrato pode vir como array de serviços ou como `{ services: [...] }`, e
 * o preço pode aparecer como `price`, `custom_price` ou `final_price` — daí a
 * flexibilidade em cada campo.
 */
export interface SuperfreteServiceOption {
  id?: string | number;
  name?: string;
  company?: { name?: string };
  delivery_days?: number;
  deliveryTime?: number;
  delivery_time?: number;
  price?: number | string;
  custom_price?: number | string;
  final_price?: number | string;
}

/** Dimensões/peso mínimos aceitos pelo SuperFrete para um pacote pequeno. */
export const MIN_PACKAGE = {
  weight: 0.3,
  height: 11,
  width: 6,
  length: 15,
} as const;
