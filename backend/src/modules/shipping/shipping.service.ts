import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import {
  MIN_PACKAGE,
  ShippingOption,
  ShippingPackage,
  ShippingQuoteResult,
  SuperfreteServiceOption,
} from './types';

const DEFAULT_API_URL = 'https://sandbox.superfrete.com/api/v2/calculator';
const REQUEST_TIMEOUT_MS = 8000;
/** Frete local de Feira de Santana (regra da loja, independe do SuperFrete). */
const LOCAL_MOTOMBOY_OPTION: ShippingOption = {
  id: 'local_motoboy',
  name: 'Motoboy / Entrega Local',
  price: 10.0,
  deliveryDays: 1,
  isLocal: true,
};

/**
 * Frete fixo por região — fallback quando a API do SuperFrete não responde
 * (rede, token inválido ou payload inesperado). Os valores são fixos para
 * manter o checkout disponível sem quebrar o build/experiência.
 */
const REGION_FALLBACK: Array<{
  id: string;
  name: string;
  test: (zipcode: string) => boolean;
  price: number;
  deliveryDays: number;
}> = [
  // Nota: para CEP 440 (Feira de Santana) não há entrada própria aqui — a
  // opção local é anexada sempre por calculate(), evitando duplicar o frete.
  {
    id: 'fallback_sudeste',
    name: 'Frete fixo (Sudeste)',
    test: (zip) => /^[0123]/.test(zip),
    price: 19.9,
    deliveryDays: 4,
  },
  {
    id: 'fallback_sul',
    name: 'Frete fixo (Sul)',
    test: (zip) => /^[89]/.test(zip),
    price: 24.9,
    deliveryDays: 5,
  },
  {
    id: 'fallback_nordeste',
    name: 'Frete fixo (Nordeste/Norte)',
    test: (zip) => /^[456]/.test(zip),
    price: 29.9,
    deliveryDays: 7,
  },
  {
    id: 'fallback_centro_oeste',
    name: 'Frete fixo (Centro-Oeste)',
    test: (zip) => /^7/.test(zip),
    price: 27.9,
    deliveryDays: 6,
  },
  {
    id: 'fallback_nacional',
    name: 'Frete fixo (Demais regiões)',
    test: () => true,
    price: 34.9,
    deliveryDays: 8,
  },
];

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async calculate(dto: CalculateShippingDto): Promise<ShippingQuoteResult> {
    const zipcode = dto.zipcode;
    const pkg = await this.buildPackage(dto.items);

    let options: ShippingOption[] = [];
    let source: ShippingQuoteResult['source'] = 'fallback';

    try {
      options = await this.fetchSuperfreteOptions(zipcode, pkg);
      if (this.normalize(options).length === 0) {
        throw new Error('SuperFrete returned no usable shipping options');
      }
      source = 'superfrete';
    } catch (error) {
      // Nunca derruba o checkout por falha da transportadora: segue no fallback.
      this.logger.warn(
        `SuperFrete unavailable, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      options = this.fallbackOptions(zipcode);
    }

    const normalized = this.normalize(options);
    const withLocal = this.isLocalZipcode(zipcode)
      ? [...normalized, LOCAL_MOTOMBOY_OPTION]
      : normalized;

    return { options: withLocal, source };
  }

  /** CEP de Feira de Santana: 44000-000 … 44099-999 (prefixo 440). */
  private isLocalZipcode(zipcode: string): boolean {
    return zipcode.startsWith('440');
  }

  private fallbackOptions(zipcode: string): ShippingOption[] {
    const region = REGION_FALLBACK.find((entry) => entry.test(zipcode));
    if (!region) return [];
    return [
      {
        id: region.id,
        name: region.name,
        price: region.price,
        deliveryDays: region.deliveryDays,
      },
    ];
  }

  /** POST na API v2 do SuperFrete; lança erro para o chamador usar o fallback. */
  private async fetchSuperfreteOptions(
    zipcode: string,
    pkg: ShippingPackage,
  ): Promise<ShippingOption[]> {
    const token = this.config.get<string>('SUPERFRETE_TOKEN');
    if (!token) {
      // Sem token não há como validar com a transportadora: cai no fallback.
      throw new Error('SUPERFRETE_TOKEN is not configured');
    }

    const endpoint =
      this.config.get<string>('SUPERFRETE_API_URL') ?? DEFAULT_API_URL;
    const origin =
      this.config.get<string>('SHIPMENT_ORIGIN_ZIPCODE') ?? '44091392';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // A API do SuperFrete lê o token pelo header "token".
          token,
        },
        body: JSON.stringify({
          from: origin,
          to: zipcode,
          weight: pkg.weight,
          height: pkg.height,
          width: pkg.width,
          length: pkg.length,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 401/403 = token inválido; demais = erro da API. Ambos caem no fallback.
        throw new Error(`SuperFrete responded with HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      return this.parseSuperfreteResponse(data);
    } finally {
      clearTimeout(timer);
    }
  }

  private parseSuperfreteResponse(data: unknown): ShippingOption[] {
    if (!data) return [];

    // A resposta pode ser um array de serviços ou um objeto { services: [...] }.
    let entries: SuperfreteServiceOption[] = [];
    if (Array.isArray(data)) {
      entries = data as SuperfreteServiceOption[];
    } else if (typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const services = record.services ?? record.options;
      if (Array.isArray(services)) {
        entries = services as SuperfreteServiceOption[];
      }
    }

    return entries
      .map((entry, index): ShippingOption | null => {
        const price = this.toPrice(entry);
        if (price === null) return null;

        const name =
          entry.name?.trim() ||
          entry.company?.name?.trim() ||
          `Serviço ${index + 1}`;

        return {
          id: String(entry.id ?? `superfrete_${index}`),
          name,
          price,
          deliveryDays: this.toDeliveryDays(entry),
        };
      })
      .filter((option): option is ShippingOption => option !== null);
  }

  private toPrice(entry: SuperfreteServiceOption): number | null {
    const raw = entry.final_price ?? entry.custom_price ?? entry.price;
    const value = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : null;
  }

  private toDeliveryDays(entry: SuperfreteServiceOption): number | null {
    const raw = entry.delivery_days ?? entry.deliveryTime ?? entry.delivery_time;
    const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : null;
  }

  /** Preços numéricos, prazos coerentes e ordenação do mais barato. */
  private normalize(options: ShippingOption[]): ShippingOption[] {
    return options
      .filter((option) => Number.isFinite(option.price) && option.price >= 0)
      .map((option) => ({
        ...option,
        price: Math.round(option.price * 100) / 100,
        deliveryDays:
          option.deliveryDays !== null && Number.isFinite(option.deliveryDays)
            ? Math.max(0, Math.round(option.deliveryDays))
            : null,
      }))
      .sort((a, b) => a.price - b.price);
  }

  /**
   * Monta o pacote a partir dos produtos.
   *
   * - Peso por item: `max(weight, 300g) * quantidade` (peso mínimo do pacote).
   * - Dimensões: maior valor por eixo entre os itens, com piso 15x11x6cm.
   * - Produto sem medida cadastrada não zera o pacote: usa o mínimo padrão.
   */
  private async buildPackage(
    items: CalculateShippingDto['items'],
  ): Promise<ShippingPackage> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        weight: true,
        height: true,
        width: true,
        length: true,
      },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    let weight = 0;
    let height = 0;
    let width = 0;
    let length = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        // Produto inexistente: pula; a cotação continua utilizável e o pedido
        // com esse produto não será criado de qualquer forma.
        continue;
      }

      weight += Math.max(product.weight ?? 0, MIN_PACKAGE.weight) * item.quantity;
      height = Math.max(height, product.height ?? 0);
      width = Math.max(width, product.width ?? 0);
      length = Math.max(length, product.length ?? 0);
    }

    return {
      weight: weight > 0 ? weight : MIN_PACKAGE.weight,
      height: Math.max(height, MIN_PACKAGE.height),
      width: Math.max(width, MIN_PACKAGE.width),
      length: Math.max(length, MIN_PACKAGE.length),
    };
  }
}
