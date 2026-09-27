import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { Logger } from '@nestjs/common';
import { assertSafePublicImageUrl } from './url-safety';

const logger = new Logger('ImageDownloader');

const MAX_BYTES = Number(process.env.IMAGE_BOT_MAX_DOWNLOAD_BYTES ?? 12_582_912);

/**
 * MIME/extensões aceitos. Alinhado ao storage de uploads (JPEG, PNG, WebP, GIF
 * e AVIF). Qualquer outro tipo continua rejeitado.
 */
const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const REJECTED_CONTENT_TYPES = new Set([
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
  'application/javascript',
  'text/javascript',
]);

function hostnameOf(url: URL): string {
  return url.hostname.toLowerCase();
}

function extensionHint(url: URL): string {
  const ext = extname(url.pathname).toLowerCase();
  return /^\.[a-z0-9]+$/.test(ext) ? ext : '';
}

function looksLikeHtml(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 256).toString('utf8').trim().toLowerCase();
  return (
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    head.startsWith('<head') ||
    head.startsWith('<body')
  );
}

function isAvif(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
  const boxSize = buffer.readUInt32BE(0);
  const scanEnd = Math.min(buffer.length, Number.isFinite(boxSize) && boxSize > 8 ? boxSize : 32);
  for (let offset = 8; offset + 4 <= scanEnd; offset += 4) {
    const brand = buffer.subarray(offset, offset + 4).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return true;
  }
  return false;
}

function extensionFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return '.png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    return '.webp';
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) {
    return '.gif';
  }
  if (isAvif(buffer)) return '.avif';
  return null;
}

function logDownload(meta: Record<string, unknown>) {
  // Nunca registrar URL completa, query string, API key, JWT ou cookies.
  logger.log(JSON.stringify(meta));
}

export type DownloadedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  sha256: string;
};

export async function downloadImage(
  rawUrl: string,
  options?: { referrer?: string },
): Promise<DownloadedImage> {
  let current = await assertSafePublicImageUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    let response: Response | null = null;
    let lastStatus = 0;

    // Redirecionamentos manuais: cada destino passa pelo mesmo filtro de SSRF.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const headers: Record<string, string> = {
        // UA de navegador: vários CDNs devolvem HTML 200 para UAs de bot.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        // Preferir os formatos que validamos; AVIF por último (já suportado no storage).
        accept: 'image/jpeg,image/png,image/webp,image/gif,image/avif;q=0.9,*/*;q=0.1',
      };

      if (options?.referrer) {
        try {
          const referrer = await assertSafePublicImageUrl(options.referrer);
          headers.referer = `${referrer.protocol}//${referrer.host}/`;
        } catch {
          // Referrer inseguro é ignorado; a URL da imagem já foi validada.
        }
      }

      response = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers,
      });
      lastStatus = response.status;

      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirecionamento sem destino.');
      current = await assertSafePublicImageUrl(new URL(location, current).toString());
    }

    if (!response) throw new Error('Não foi possível obter a imagem.');

    const declared =
      response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    const domain = hostnameOf(current);
    const urlExt = extensionHint(current);

    if (!response.ok) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared || null,
        bytes: contentLength || 0,
        extension: urlExt || null,
        validation: 'rejected-http',
      });
      throw new Error(`Download retornou HTTP ${response.status}.`);
    }

    if (contentLength > MAX_BYTES) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared || null,
        bytes: contentLength,
        extension: urlExt || null,
        validation: 'rejected-size',
      });
      throw new Error('Imagem excede o tamanho máximo permitido.');
    }

    if (declared && REJECTED_CONTENT_TYPES.has(declared)) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared,
        bytes: contentLength || 0,
        extension: urlExt || null,
        validation: 'rejected-content-type',
      });
      throw new Error(
        `O servidor não devolveu uma imagem (content-type: ${declared}).`,
      );
    }

    if (declared.startsWith('image/') && !ALLOWED_TYPES.has(declared)) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared,
        bytes: contentLength || 0,
        extension: urlExt || null,
        validation: 'rejected-mime',
      });
      throw new Error(`Tipo de imagem não suportado: ${declared}.`);
    }

    const body = response.body;
    if (!body) throw new Error('Resposta sem corpo.');

    const reader = body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        logDownload({
          domain,
          status: lastStatus,
          contentType: declared || null,
          bytes: total,
          extension: urlExt || null,
          validation: 'rejected-size',
        });
        throw new Error('Imagem excede o tamanho máximo permitido.');
      }
      chunks.push(Buffer.from(value));
    }

    const buffer = Buffer.concat(chunks);

    if (looksLikeHtml(buffer)) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared || 'text/html',
        bytes: buffer.length,
        extension: urlExt || null,
        validation: 'rejected-html',
      });
      throw new Error(
        `O arquivo baixado é HTML, não uma imagem (content-type: ${declared || 'ausente'}).`,
      );
    }

    const magicExtension = extensionFromMagic(buffer);
    if (!magicExtension) {
      logDownload({
        domain,
        status: lastStatus,
        contentType: declared || null,
        bytes: buffer.length,
        extension: urlExt || null,
        validation: 'rejected-magic',
      });
      throw new Error(
        'O arquivo baixado não parece ser uma imagem JPEG, PNG, WebP, GIF ou AVIF.',
      );
    }

    const normalizedType =
      [...ALLOWED_TYPES.entries()].find(([, ext]) => ext === magicExtension)?.[0] ??
      declared;

    logDownload({
      domain,
      status: lastStatus,
      contentType: declared || normalizedType,
      bytes: buffer.length,
      extension: magicExtension,
      validation: 'ok',
    });

    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return {
      buffer,
      contentType: normalizedType || declared || 'application/octet-stream',
      extension: magicExtension,
      sha256,
    };
  } finally {
    clearTimeout(timer);
  }
}
