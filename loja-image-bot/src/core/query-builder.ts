import type { ProductIdentity, SearchQuery } from './types.js';

function compact(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quote(value: string): string {
  return `"${value.replaceAll('"', '').trim()}"`;
}

export function buildSearchQueries(product: ProductIdentity): SearchQuery[] {
  const name = product.name.trim();
  const brand = product.brand?.trim();
  const model = product.model?.trim();
  const volume = product.volume?.trim();
  const variant = product.variant?.trim();
  const category = product.category?.trim();

  const base = compact([brand, model || name, volume, variant, category]);
  const exact = compact([quote(name), brand ? quote(brand) : undefined]);

  const candidates: SearchQuery[] = [
    { text: exact, reason: 'nome e marca exatos' },
    { text: compact([brand, name, volume]), reason: 'produto + marca + volume' },
    { text: compact([brand, model, name]), reason: 'marca + modelo + nome' },
    { text: base, reason: 'ficha completa do produto' },
    { text: compact([name, 'produto original']), reason: 'reduzir resultados genéricos' },
    { text: compact(['site:mercadolivre.com.br', quote(name), brand ? quote(brand) : undefined]), reason: 'mercado brasileiro' },
    { text: compact(['site:shopee.com.br', quote(name), brand ? quote(brand) : undefined]), reason: 'marketplace brasileiro' },
  ];

  const deduped: SearchQuery[] = [];
  const seen = new Set<string>();
  for (const query of candidates) {
    const normalized = query.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(query);
  }
  return deduped.slice(0, 7);
}
