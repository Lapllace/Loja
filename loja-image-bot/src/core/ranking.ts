import type { ImageCandidate, ProductIdentity } from './types.js';

function tokens(value: string | undefined): string[] {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function tokenCoverage(haystack: string, wanted: string[]): number {
  if (!wanted.length) return 0;
  const normalized = haystack.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hitCount = wanted.filter((token) => normalized.includes(token)).length;
  return hitCount / wanted.length;
}

export function scoreCandidate(product: ProductIdentity, candidate: Omit<ImageCandidate, 'score'>): number {
  const title = candidate.title ?? '';
  const source = candidate.source ?? '';
  const searchText = `${title} ${source} ${candidate.sourceUrl}`;

  let score = 0;
  score += Math.round(tokenCoverage(searchText, tokens(product.name)) * 40);
  score += Math.round(tokenCoverage(searchText, tokens(product.brand)) * 20);
  score += Math.round(tokenCoverage(searchText, tokens(product.model)) * 25);
  score += Math.round(tokenCoverage(searchText, tokens(product.volume)) * 10);
  score += Math.round(tokenCoverage(searchText, tokens(product.variant)) * 5);

  if ((candidate.width ?? 0) >= 1000) score += 8;
  if ((candidate.height ?? 0) >= 1000) score += 8;
  if (candidate.imageUrl) score += 2;

  const domain = source.toLowerCase();
  if (domain.includes('mercadolivre')) score += 2;
  if (domain.includes('shopee')) score += 2;

  return score;
}
