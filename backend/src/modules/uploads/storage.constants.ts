import { existsSync, mkdirSync } from 'fs';
import { extname, join, resolve } from 'path';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Diretório físico onde os arquivos enviados são gravados.
 * Fica fora de `src/` para sobreviver a restarts e não ser recompilado.
 */
export const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

/** Prefixo público servido pelo Nest via `useStaticAssets`. */
export const UPLOADS_URL_PREFIX = '/uploads';

/** Extensões e MIME types aceitos para imagens de produto. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/** Limite de tamanho por arquivo: 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Garante que a pasta de uploads exista antes de o Multer gravar nela. */
export function ensureUploadsDir(): string {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

/** Nome de arquivo único e seguro (evita colisão e path traversal). */
export function buildFileName(originalName: string, mimeType?: string): string {
  const safeExt = extname(originalName).toLowerCase().slice(0, 10);
  const ext =
    safeExt && /^\.[a-z0-9]+$/.test(safeExt)
      ? safeExt
      : (EXTENSION_BY_MIME[mimeType ?? ''] ?? '.jpg');

  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}${ext}`;
}

/** Configuração do Multer: disco, nome único e filtro de imagens. */
export const productImageMulterOptions = {
  storage: diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      try {
        cb(null, ensureUploadsDir());
      } catch (error) {
        cb(error as Error, UPLOADS_DIR);
      }
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      cb(null, buildFileName(file.originalname, file.mimetype));
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        new BadRequestException(
          `Unsupported image type: ${file.mimetype}. Use JPEG, PNG, WEBP, GIF or AVIF.`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

/** Caminho físico de um arquivo salvo a partir do nome. */
export function resolveStoredFile(fileName: string): string {
  return join(UPLOADS_DIR, fileName);
}

/** URL pública (relativa) de um arquivo salvo. */
export function toPublicUrl(fileName: string): string {
  return `${UPLOADS_URL_PREFIX}/${fileName}`;
}
