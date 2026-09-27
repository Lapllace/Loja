import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImageSearchController } from './image-search.controller';
import { ImageSearchService } from './image-search.service';
import { ImageSuggestionsService } from './image-suggestions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

describe('ImageSearchController', () => {
  let controller: ImageSearchController;

  const mockService = {
    search: jest.fn(),
    downloadSelected: jest.fn(),
  };

  const mockSuggestions = {
    suggest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageSearchController],
      providers: [
        { provide: ImageSearchService, useValue: mockService },
        { provide: ImageSuggestionsService, useValue: mockSuggestions },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImageSearchController>(ImageSearchController);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('autorização', () => {
    it('a classe exige a role OWNER (nenhuma role nova)', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, ImageSearchController);
      expect(roles).toEqual([UserRole.OWNER]);
    });
  });

  describe('SUGGESTIONS (autocomplete)', () => {
    it('delega ao service de sugestões (endpoint separado da busca)', async () => {
      mockSuggestions.suggest.mockResolvedValue({
        suggestions: ['Asad Lattafa', 'Asad 100ml'],
      });

      const result = await controller.suggestions('Asad');

      expect(mockSuggestions.suggest).toHaveBeenCalledWith('Asad');
      expect(result.suggestions).toHaveLength(2);
      // NÃO deve acionar a busca de imagens.
      expect(mockService.search).not.toHaveBeenCalled();
    });

    it('trata query ausente como string vazia', async () => {
      mockSuggestions.suggest.mockResolvedValue({ suggestions: [] });

      await controller.suggestions(undefined);

      expect(mockSuggestions.suggest).toHaveBeenCalledWith('');
    });
  });

  describe('SEARCH', () => {
    it('aceita apenas { query } e NÃO exige productId', async () => {
      mockService.search.mockResolvedValue({
        query: 'Asad',
        queries: [{ text: '"Asad"', reason: 'termo exato' }],
        candidates: [],
      });

      const result = await controller.search({ query: 'Asad' });

      expect(mockService.search).toHaveBeenCalledWith({ query: 'Asad' });
      // O DTO aceito nao possui productId — o service nao deve receber esse campo.
      expect(mockService.search.mock.calls[0][0]).not.toHaveProperty('productId');
      expect(result.query).toBe('Asad');
    });

    it('propaga BadRequest quando o service rejeita a query', async () => {
      mockService.search.mockRejectedValue(
        new BadRequestException('Informe um termo de pesquisa.'),
      );

      await expect(controller.search({ query: '   ' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('IMPORT', () => {
    const baseImages = [
      {
        id: '1',
        title: 't',
        source: 's',
        sourceUrl: 'https://a.com/p',
        imageUrl: 'https://a.com/i.jpg',
        query: 'Asad',
      },
    ];

    it('importa imagens exigindo productId e delega ao service', async () => {
      mockService.downloadSelected.mockResolvedValue({
        product: { id: 'p1', name: 'Asad', sku: 'SKU1' },
        images: [{ id: 'img1', url: '/uploads/x.jpg', alt: 'Asad', position: 0 }],
      });

      const result = await controller.import({
        productId: 'p1',
        images: baseImages,
      });

      expect(mockService.downloadSelected).toHaveBeenCalledTimes(1);
      expect(result.images).toHaveLength(1);
    });

    it('propaga NotFound para produto inexistente', async () => {
      mockService.downloadSelected.mockRejectedValue(
        new NotFoundException('Produto não encontrado'),
      );

      await expect(
        controller.import({ productId: 'nao-existe', images: baseImages }),
      ).rejects.toThrow(NotFoundException);
    });

    it('mantém a rota legada download funcionando', async () => {
      mockService.downloadSelected.mockResolvedValue({
        product: { id: 'p1', name: 'Asad', sku: 'SKU1' },
        images: [],
      });

      await controller.download({ productId: 'p1', images: baseImages });

      expect(mockService.downloadSelected).toHaveBeenCalledTimes(1);
    });
  });
});
