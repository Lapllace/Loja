import { buildSearchQueries } from './query-builder';
import { downloadImage } from './downloader';
import { scoreCandidate } from './ranking';
import type { ImageSearchProvider } from '../providers/provider';
import type {
  ImageCandidate,
  ImageDownloadAttempt,
  ProductIdentity,
  SearchResult,
  SelectedImage,
} from './types';

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
    private readonly maxResults = Number(process.env.IMAGE_BOT_MAX_RESULTS ?? 30),
  ) {}

  async search(product: ProductIdentity): Promise<SearchResult> {
    const queries = buildSearchQueries(product);
    const all: ImageCandidate[] = [];
    let queriesFailed = 0;

    for (const query of queries) {
      let results: ImageCandidate[] = [];
      try {
        results = await this.provider.search(product, query);
      } catch {
        // Uma variação de query pode falhar (sem resultados no provedor, timeout
        // pontual etc.). Isso NÃO deve derrubar a busca inteira: seguimos para a
        // próxima variação. Se TODAS falharem, tratamos abaixo.
        queriesFailed += 1;
        continue;
      }
      for (const candidate of results) {
        all.push({ ...candidate, score: scoreCandidate(product, candidate) });
      }
      // Evita uma explosão de chamadas e resultados na primeira versão.
      if (all.length >= 80) break;
    }

    // Se nenhuma variação retornou nada E todas falharam, o problema é o
    // provedor (indisponível/timeout) — informamos isso de forma acionável.
    if (all.length === 0 && queriesFailed === queries.length) {
      throw new Error(
        'A busca de imagens está indisponível no momento (o provedor não respondeu). Tente novamente em instantes.',
      );
    }

    const candidates = dedupeCandidates(all)
      .sort((a, b) => b.score - a.score || (a.position ?? 999) - (b.position ?? 999))
      .slice(0, this.maxResults);

    return { product, queries, candidates };
  }

  async downloadSelected(
    _product: ProductIdentity,
    selected: SelectedImage[],
  ): Promise<{
    downloadedImages: Array<{
      buffer: Buffer;
      contentType: string;
      extension: string;
      sha256: string;
      imageUrl: string;
      sourceUrl: string;
      query: string;
    }>;
    results: ImageDownloadAttempt[];
  }> {
    if (!selected.length) throw new Error('Selecione pelo menos uma imagem.');
    if (selected.length > 5) throw new Error('É permitido selecionar no máximo 5 imagens para download.');

    const downloadedImages: Array<{
      buffer: Buffer;
      contentType: string;
      extension: string;
      sha256: string;
      imageUrl: string;
      sourceUrl: string;
      query: string;
    }> = [];
    const results: ImageDownloadAttempt[] = [];
    const hashes = new Set<string>();

    for (const item of selected) {
      try {
        let downloaded;
        try {
          downloaded = await downloadImage(item.imageUrl, { referrer: item.sourceUrl });
        } catch (originalError) {
          // Alguns resultados de redes sociais anunciam uma URL "original" que
          // responde HTML para servidores. A thumbnail é um fallback validado,
          // nunca uma aceitação do conteúdo original sem magic bytes.
          if (!item.thumbnailUrl || item.thumbnailUrl === item.imageUrl) throw originalError;
          downloaded = await downloadImage(item.thumbnailUrl, { referrer: item.sourceUrl });
        }
        if (hashes.has(downloaded.sha256)) {
          results.push({
            success: true,
            id: item.id,
            imageUrl: item.imageUrl,
            sourceUrl: item.sourceUrl,
            query: item.query,
            ...downloaded,
          });
          continue;
        }
        hashes.add(downloaded.sha256);

        downloadedImages.push({
          buffer: downloaded.buffer,
          contentType: downloaded.contentType,
          extension: downloaded.extension,
          sha256: downloaded.sha256,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl,
          query: item.query,
        });
        results.push({
          success: true,
          id: item.id,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl,
          query: item.query,
          ...downloaded,
        });
      } catch (error) {
        let domain: string | undefined;
        try {
          domain = new URL(item.imageUrl).hostname.toLowerCase();
        } catch {
          domain = undefined;
        }
        results.push({
          success: false,
          id: item.id,
          domain,
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível baixar esta imagem.',
        });
      }
    }

    return { downloadedImages, results };
  }
}
