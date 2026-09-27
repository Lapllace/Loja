import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertSafePublicImageUrl } from './url-safety.js';

const MAX_BYTES = Number(process.env.IMAGE_BOT_MAX_DOWNLOAD_BYTES ?? 12_582_912);
const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

function extensionFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return '.webp';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return '.gif';
  return null;
}

export async function downloadImage(rawUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
  extension: string;
  sha256: string;
}> {
  let current = await assertSafePublicImageUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    let response: Response | null = null;

    // Redirecionamentos são tratados manualmente para que cada destino seja
    // validado contra SSRF antes da próxima requisição.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'user-agent': 'LojaImageBot/0.1 (+product-image-review)',
          accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirecionamento sem destino.');
      current = await assertSafePublicImageUrl(new URL(location, current).toString());
    }

    if (!response) throw new Error('Não foi possível obter a imagem.');
    if (!response.ok) throw new Error(`Download retornou HTTP ${response.status}.`);

    const declared = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BYTES) throw new Error('Imagem excede o tamanho máximo permitido.');

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
        throw new Error('Imagem excede o tamanho máximo permitido.');
      }
      chunks.push(Buffer.from(value));
    }

    const buffer = Buffer.concat(chunks);
    const magicExtension = extensionFromMagic(buffer);
    if (!magicExtension) throw new Error('O arquivo baixado não parece ser uma imagem JPEG, PNG, WebP ou GIF.');

    const normalizedType = [...ALLOWED_TYPES.entries()].find(([, ext]) => ext === magicExtension)?.[0] ?? declared;
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return { buffer, contentType: normalizedType || declared || 'application/octet-stream', extension: magicExtension, sha256 };
  } finally {
    clearTimeout(timer);
  }
}

export async function saveImage(outputDir: string, filename: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const target = path.join(outputDir, filename);
  await fs.writeFile(target, buffer, { flag: 'wx' }).catch(async (error: unknown) => {
    if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error;
  });
  return target;
}
