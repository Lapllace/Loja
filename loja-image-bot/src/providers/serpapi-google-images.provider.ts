import type { ImageCandidate, ProductIdentity, SearchQuery } from '../core/types.js';
import type { ImageSearchProvider } from './provider.js';

export class SerpApiGoogleImagesProvider implements ImageSearchProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey.trim()) throw new Error('SERPAPI_KEY não configurada.');
  }

  async search(_product: ProductIdentity, query: SearchQuery): Promise<ImageCandidate[]> {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_images');
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('q', query.text);
    url.searchParams.set('gl', 'br');
    url.searchParams.set('hl', 'pt-br');
    url.searchParams.set('safe', 'active');

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`SerpApi retornou HTTP ${response.status}.`);

    const payload = await response.json() as {
      error?: string;
      images_results?: Array<Record<string, unknown>>;
    };
    if (payload.error) throw new Error(payload.error);

    return (payload.images_results ?? [])
      .map((item, index) => {
        const title = String(item.title ?? '');
        const source = String(item.source ?? '');
        const sourceUrl = String(item.link ?? item.source_url ?? '');
        const imageUrl = String(item.original ?? item.image ?? '');
        const thumbnailUrl = item.thumbnail ? String(item.thumbnail) : undefined;
        if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;

        const width = Number(item.original_width ?? item.width ?? NaN);
        const height = Number(item.original_height ?? item.height ?? NaN);

        return {
          id: `serpapi-${query.text}-${String(item.position ?? index + 1)}`,
          title,
          source,
          sourceUrl,
          thumbnailUrl,
          imageUrl,
          width: Number.isFinite(width) ? width : undefined,
          height: Number.isFinite(height) ? height : undefined,
          position: Number(item.position ?? index + 1),
          query: query.text,
          score: 0,
        } satisfies ImageCandidate;
      })
      .filter((candidate): candidate is ImageCandidate => candidate !== null);
  }
}
