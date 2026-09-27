import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import {
  ImageSuggestionsService,
  MAX_SUGGESTIONS,
  MIN_QUERY_LENGTH,
} from './image-suggestions.service';

describe('ImageSuggestionsService', () => {
  let service: ImageSuggestionsService;
  let fetchMock: jest.SpyInstance;

  const buildModule = async (apiKey: string | undefined) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageSuggestionsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(apiKey) },
        },
      ],
    }).compile();

    return module.get<ImageSuggestionsService>(ImageSuggestionsService);
  };

  const okResponse = (values: string[]) => ({
    ok: true,
    json: async () => ({ suggestions: values.map((value) => ({ value })) }),
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch' as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query curta', () => {
    it('não chama o provedor com menos de 2 caracteres', async () => {
      service = await buildModule('key');
      const result = await service.suggest('a');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.suggestions).toEqual([]);
    });

    it('não chama o provedor com query vazia', async () => {
      service = await buildModule('key');
      const result = await service.suggest('   ');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.suggestions).toEqual([]);
    });

    it('consulta a partir de 2 caracteres', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(okResponse(['Asad Lattafa']));

      const result = await service.suggest('as');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.suggestions).toEqual(['Asad Lattafa']);
    });

    it('MIN_QUERY_LENGTH é 2', () => {
      expect(MIN_QUERY_LENGTH).toBe(2);
    });
  });

  describe('normalização', () => {
    it('limita a 3 sugestões', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(
        okResponse(['a1', 'a2', 'a3', 'a4', 'a5']),
      );

      const result = await service.suggest('asad');

      expect(result.suggestions).toHaveLength(MAX_SUGGESTIONS);
      expect(MAX_SUGGESTIONS).toBe(3);
    });

    it('remove duplicadas (case-insensitive)', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(
        okResponse(['Asad Lattafa', 'asad lattafa', 'Asad 100ml']),
      );

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual(['Asad Lattafa', 'Asad 100ml']);
    });

    it('remove vazias e espaços', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(
        okResponse(['  ', 'Asad Lattafa', '   ', 'Asad 100ml']),
      );

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual(['Asad Lattafa', 'Asad 100ml']);
    });

    it('aceita sugestões como string simples', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: ['Asad Lattafa'] }),
      });

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual(['Asad Lattafa']);
    });

    it('não vaza a api key nem dados internos', async () => {
      service = await buildModule('segredo-nao-pode-vazar');
      fetchMock.mockResolvedValue(okResponse(['Asad']));

      const result = await service.suggest('asad');
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('segredo-nao-pode-vazar');
      expect(Object.keys(result)).toEqual(['suggestions']);
    });
  });

  describe('parâmetros enviados ao provedor', () => {
    it('usa engine google_autocomplete com gl=br e hl=pt-BR', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(okResponse(['Asad']));

      await service.suggest('asad');

      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('serpapi.com/search');
      expect(url).toContain('engine=google_autocomplete');
      expect(url).toContain('gl=br');
      expect(url).toContain('hl=pt-BR');
      expect(url).toContain('q=asad');
    });

    it('a api key só vai na chamada do servidor', async () => {
      service = await buildModule('minha-key');
      fetchMock.mockResolvedValue(okResponse(['Asad']));

      const result = await service.suggest('asad');

      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain('api_key=minha-key');
      expect(JSON.stringify(result)).not.toContain('minha-key');
    });
  });

  describe('cache', () => {
    it('serve do cache sem chamar o provedor de novo', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(okResponse(['Asad Lattafa']));

      const first = await service.suggest('asad');
      const second = await service.suggest('asad');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second.suggestions).toEqual(first.suggestions);
    });

    it('aproveita o cache com caixa/espaços diferentes', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(okResponse(['Asad Lattafa']));

      await service.suggest('Asad');
      await service.suggest('  asad  ');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('queries diferentes usam chamadas diferentes', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue(okResponse(['x']));

      await service.suggest('asad');
      await service.suggest('faruk');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('falhas do provedor', () => {
    it('retorna lista vazia (não quebra a UI) em HTTP de erro', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual([]);
    });

    it('retorna lista vazia quando o fetch lança', async () => {
      service = await buildModule('key');
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual([]);
    });

    it('retorna lista vazia quando o provedor devolve error', async () => {
      service = await buildModule('key');
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'quota exceeded' }),
      });

      const result = await service.suggest('asad');

      expect(result.suggestions).toEqual([]);
    });

    it('exige SERPAPI_KEY configurada', async () => {
      service = await buildModule(undefined);

      await expect(service.suggest('asad')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
