import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Máximo de sugestões retornadas (contrato com o frontend). */
export const MAX_SUGGESTIONS = 3;

/** TTL do cache em memória: 1 hora, conforme orientação do SerpApi. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Mínimo de caracteres para consultar o autocomplete. */
export const MIN_QUERY_LENGTH = 2;

interface CacheEntry {
  suggestions: string[];
  expiresAt: number;
}

/**
 * Sugestões de pesquisa via SerpApi Google Autocomplete.
 *
 * Separado da busca de imagens: autocomplete é leve e frequente, enquanto a
 * pesquisa de imagens é pesada. A `SERPAPI_KEY` fica exclusivamente aqui, no
 * backend — o navegador nunca a vê.
 *
 * Cache em memória com TTL de 1h: o autocomplete gera muitas chamadas para as
 * mesmas queries, e a SerpApi permite servir resultados em cache sem consumir a
 * cota mensal quando consulta e parâmetros coincidem. Não há Redis nem
 * infraestrutura extra.
 */
@Injectable()
export class ImageSuggestionsService {
  private readonly logger = new Logger(ImageSuggestionsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  async suggest(rawQuery: string): Promise<{ suggestions: string[] }> {
    const query = rawQuery?.trim() ?? '';

    // Query curta demais: não vale a pena chamar o provedor.
    if (query.length < MIN_QUERY_LENGTH) {
      return { suggestions: [] };
    }

    const cacheKey = this.buildCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { suggestions: cached.suggestions };
    }

    const apiKey = this.config.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'SERPAPI_KEY não configurada. Configure a variável de ambiente para usar as sugestões.',
      );
    }

    const suggestions = await this.fetchSuggestions(query, apiKey);

    this.cache.set(cacheKey, {
      suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    this.pruneCache();

    return { suggestions };
  }

  private buildCacheKey(query: string): string {
    // Normaliza para aproveitar o cache entre variacoes de caixa e espacos.
    const normalized = query.toLowerCase().replace(/\s+/g, '').trim();
    return `${normalized}|br|pt-BR`;
  }

  private async fetchSuggestions(
    query: string,
    apiKey: string,
  ): Promise<string[]> {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_autocomplete');
    url.searchParams.set('q', query);
    url.searchParams.set('gl', 'br');
    url.searchParams.set('hl', 'pt-BR');
    url.searchParams.set('api_key', apiKey);

    let payload: {
      error?: string;
      suggestions?: Array<{ value?: string } | string>;
    };

    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`SerpApi retornou HTTP ${response.status}.`);
      }
      payload = (await response.json()) as typeof payload;
    } catch (error) {
      // Autocomplete é um auxílio de UX: falhar aqui não deve quebrar a tela.
      this.logger.warn(
        `Falha ao obter sugestões: ${(error as Error).message}`,
      );
      return [];
    }

    if (payload.error) {
      this.logger.warn(`SerpApi (autocomplete): ${payload.error}`);
      return [];
    }

    return this.normalize(payload.suggestions ?? []);
  }

  /**
   * Extrai, remove duplicadas e limita a lista de sugestões.
   * A SerpApi pode devolver objetos `{ value }` ou strings simples.
   */
  private normalize(raw: Array<{ value?: string } | string>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const item of raw) {
      const value = (typeof item === 'string' ? item : item?.value ?? '').trim();
      if (!value) continue;

      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push(value);
      if (out.length >= MAX_SUGGESTIONS) break;
    }

    return out;
  }

  /** Remove entradas expiradas para o cache não crescer indefinidamente. */
  private pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }
}
