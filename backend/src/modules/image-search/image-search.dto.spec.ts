import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  SearchProductImagesDto,
  DownloadSelectedImagesDto,
} from './image-search.dto';

/**
 * Valida as regras dos DTOs usando o mesmo `class-validator` que o
 * `ValidationPipe` global aplica em runtime (whitelist + transform).
 */
async function errorsFor(cls: any, payload: Record<string, unknown>) {
  const instance = plainToInstance(cls, payload);
  return validate(instance as object);
}

function messages(errors: Awaited<ReturnType<typeof validate>>): string[] {
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const image = (n: number) => ({
  id: `id-${n}`,
  title: `t${n}`,
  source: 'mercadolivre',
  sourceUrl: `https://a.com/p${n}`,
  imageUrl: `https://a.com/i${n}.jpg`,
  query: 'Asad',
});

describe('ImageSearch DTOs', () => {
  describe('SearchProductImagesDto', () => {
    it('aceita apenas { query }', async () => {
      const errors = await errorsFor(SearchProductImagesDto, { query: 'Asad' });
      expect(errors).toHaveLength(0);
    });

    it('NÃO exige productId', async () => {
      const errors = await errorsFor(SearchProductImagesDto, { query: 'Asad' });
      const all = messages(errors).join(' ');
      expect(all).not.toMatch(/productId/i);
    });

    it('rejeita query vazia', async () => {
      const errors = await errorsFor(SearchProductImagesDto, { query: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejeita query ausente', async () => {
      const errors = await errorsFor(SearchProductImagesDto, {});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejeita query muito grande (> 200)', async () => {
      const errors = await errorsFor(SearchProductImagesDto, {
        query: 'x'.repeat(201),
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('aceita campos opcionais de identidade', async () => {
      const errors = await errorsFor(SearchProductImagesDto, {
        query: 'Asad',
        brand: 'Lattafa',
        volume: '100ml',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('DownloadSelectedImagesDto', () => {
    it('exige productId (importação precisa do produto)', async () => {
      const errors = await errorsFor(DownloadSelectedImagesDto, {
        images: [image(1)],
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('aceita 1 imagem', async () => {
      const errors = await errorsFor(DownloadSelectedImagesDto, {
        productId: 'p1',
        images: [image(1)],
      });
      expect(errors).toHaveLength(0);
    });

    it('aceita 5 imagens', async () => {
      const errors = await errorsFor(DownloadSelectedImagesDto, {
        productId: 'p1',
        images: [1, 2, 3, 4, 5].map(image),
      });
      expect(errors).toHaveLength(0);
    });

    it('rejeita 6 imagens (máximo 5)', async () => {
      const errors = await errorsFor(DownloadSelectedImagesDto, {
        productId: 'p1',
        images: [1, 2, 3, 4, 5, 6].map(image),
      });
      expect(messages(errors).join(' ')).toMatch(/at most 5/i);
    });

    it('rejeita imagem sem imageUrl', async () => {
      const errors = await errorsFor(DownloadSelectedImagesDto, {
        productId: 'p1',
        images: [{ ...image(1), imageUrl: '' }],
      });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
