import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSearchQueries } from './query-builder.js';
import { downloadImage, saveImage } from './downloader.js';
import { scoreCandidate } from './ranking.js';
import type { ImageSearchProvider } from '../providers/provider.js';
import type { ImageCandidate, ProductIdentity, ProductImageManifest, SearchResult, SelectedImage } from './types.js';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function dedupeCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  const result: ImageCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.imageUrl.toLowerCase().split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

export class ImageCollector {
  constructor(
    private readonly provider: ImageSearchProvider,
    private readonly storageDir: string,
    private readonly maxResults = Number(process.env.IMAGE_BOT_MAX_RESULTS ?? 30),
  ) {}

  async search(product: ProductIdentity): Promise<SearchResult> {
    const queries = buildSearchQueries(product);
    const all: ImageCandidate[] = [];

    for (const query of queries) {
      const results = await this.provider.search(product, query);
      for (const candidate of results) {
        all.push({ ...candidate, score: scoreCandidate(product, candidate) });
      }
      // Evita uma explosão de chamadas e resultados na primeira versão.
      if (all.length >= 80) break;
    }

    const candidates = dedupeCandidates(all)
      .sort((a, b) => b.score - a.score || (a.position ?? 999) - (b.position ?? 999))
      .slice(0, this.maxResults);

    return { product, queries, candidates };
  }

  async downloadSelected(product: ProductIdentity, selected: SelectedImage[]): Promise<ProductImageManifest> {
    if (!selected.length) throw new Error('Selecione pelo menos uma imagem.');
    if (selected.length > 5) throw new Error('A primeira versão limita a coleta a 5 imagens por produto.');

    const folderName = product.productId ? `${product.productId}-${slugify(product.name)}` : slugify(product.name);
    const folder = path.join(this.storageDir, folderName);
    await fs.mkdir(folder, { recursive: true });

    const images: ProductImageManifest['images'] = [];
    const hashes = new Set<string>();

    for (const [index, item] of selected.entries()) {
      const downloaded = await downloadImage(item.imageUrl);
      if (hashes.has(downloaded.sha256)) continue;
      hashes.add(downloaded.sha256);

      const filename = `${String(images.length + 1).padStart(2, '0')}${downloaded.extension}`;
      await saveImage(folder, filename, downloaded.buffer);
      images.push({
        ...item,
        file: filename,
        sha256: downloaded.sha256,
        collectedAt: new Date().toISOString(),
        bytes: downloaded.buffer.length,
        contentType: downloaded.contentType,
      });
      void index;
    }

    const manifest: ProductImageManifest = {
      product,
      generatedAt: new Date().toISOString(),
      images,
    };

    await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    return manifest;
  }
}
