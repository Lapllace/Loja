import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ImageCollector } from './core/collector';
import { SerpApiGoogleImagesProvider } from './providers/serpapi-google-images.provider';
import type { ProductIdentity, SelectedImage } from './core/types';
import { SearchProductImagesDto, DownloadSelectedImagesDto } from './image-search.dto';
import fs from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class ImageSearchService {
  private readonly logger = new Logger(ImageSearchService.name);
  private readonly collector: ImageCollector;
  private readonly manifestDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {
    const apiKey = config.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      this.logger.warn('SERPAPI_KEY não configurada. A funcionalidade de busca de imagens não estará disponível.');
    }

    this.collector = new ImageCollector(
      new SerpApiGoogleImagesProvider(apiKey || ''),
    );

    this.manifestDir = path.join(process.cwd(), 'uploads', 'image-bot-manifests');
  }

  /**
   * Busca candidatas a partir de um termo livre.
   *
   * Nao consulta o banco e nao exige `productId`: o produto pode ainda nao
   * existir (fluxo do cadastro). Os campos opcionais de identidade apenas
   * enriquecem a geracao automatica de queries.
   */
  async search(dto: SearchProductImagesDto) {
    const apiKey = this.config.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'SERPAPI_KEY não configurada. Configure a variável de ambiente para usar a busca de imagens.',
      );
    }

    const query = dto.query?.trim();
    if (!query) {
      throw new BadRequestException('Informe um termo de pesquisa.');
    }

    const productIdentity: ProductIdentity = {
      name: query,
      brand: dto.brand?.trim() || undefined,
      model: dto.model?.trim() || undefined,
      volume: dto.volume?.trim() || undefined,
      variant: dto.variant?.trim() || undefined,
      category: dto.category?.trim() || undefined,
    };

    const result = await this.collector.search(productIdentity);

    return { ...result, query };
  }

  async downloadSelected(dto: DownloadSelectedImagesDto) {
    const apiKey = this.config.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      throw new BadRequestException('SERPAPI_KEY não configurada.');
    }

    // Validar que o produto existe
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { category: true, brand: true },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const productIdentity: ProductIdentity = {
      productId: product.id,
      name: dto.name?.trim() || product.name,
      brand: dto.brand?.trim() || product.brand?.name,
      model: dto.model?.trim() || undefined,
      volume: dto.volume?.trim() || undefined,
      variant: dto.variant?.trim() || undefined,
      category: dto.category?.trim() || product.category?.name,
    };

    const selectedImages: SelectedImage[] = dto.images.map(img => ({
      id: img.id,
      title: img.title,
      source: img.source,
      sourceUrl: img.sourceUrl,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      query: img.query,
    }));

    // Baixar uma a uma: falha pontual não aborta as demais.
    const { downloadedImages, results } = await this.collector.downloadSelected(
      productIdentity,
      selectedImages,
    );

    const createdImages: Array<{ id: string; url: string; alt: string | null; position: number }> = [];
    const manifestImages: Array<{
      productImageId: string;
      file: string;
      sha256: string;
      collectedAt: string;
      bytes: number;
      contentType: string;
      imageUrl: string;
      sourceUrl: string;
      query: string;
    }> = [];
    const savedUrlByHash = new Map<string, string>();

    for (const [index, downloaded] of downloadedImages.entries()) {
      // Salvar arquivo via UploadsService (método manual)
      const fileName = this.generateFileName(downloaded.extension);
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      await fs.writeFile(filePath, downloaded.buffer);

      const publicUrl = `/uploads/${fileName}`;

      // Criar ProductImage no banco
      const maxPos = await this.prisma.productImage.aggregate({
        where: { productId: product.id },
        _max: { position: true },
      });
      const position = (maxPos._max.position ?? -1) + 1 + index;

      const productImage = await this.prisma.productImage.create({
        data: {
          url: publicUrl,
          alt: `${product.name} - Imagem ${index + 1}`,
          position,
          productId: product.id,
        },
      });

      createdImages.push(productImage);
      savedUrlByHash.set(downloaded.sha256, productImage.url);

      // Adicionar ao manifest
      manifestImages.push({
        productImageId: productImage.id,
        file: fileName,
        sha256: downloaded.sha256,
        collectedAt: new Date().toISOString(),
        bytes: downloaded.buffer.length,
        contentType: downloaded.contentType,
        imageUrl: downloaded.imageUrl,
        sourceUrl: downloaded.sourceUrl,
        query: downloaded.query,
      });
    }

    if (manifestImages.length > 0) {
      await this.saveManifest(product.id, productIdentity, manifestImages);
    }

    const publicResults = results.map((item) => {
      if (item.success) {
        return {
          success: true as const,
          id: item.id,
          url: savedUrlByHash.get(item.sha256),
        };
      }
      return {
        success: false as const,
        id: item.id,
        domain: item.domain,
        error: item.error,
      };
    });

    return {
      success: true,
      imported: createdImages.length,
      failed: publicResults.filter((item) => !item.success).length,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
      images: createdImages,
      results: publicResults,
      manifestPath:
        manifestImages.length > 0
          ? path.join(this.manifestDir, `${product.id}.json`)
          : undefined,
    };
  }

  private generateFileName(extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 10);
    return `${timestamp}-${random}${extension}`;
  }

  private async saveManifest(
    productId: string,
    productIdentity: ProductIdentity,
    images: Array<{
      productImageId: string;
      file: string;
      sha256: string;
      collectedAt: string;
      bytes: number;
      contentType: string;
      imageUrl: string;
      sourceUrl: string;
      query: string;
    }>,
  ) {
    await fs.mkdir(this.manifestDir, { recursive: true });

    const manifest = {
      productId,
      product: productIdentity,
      generatedAt: new Date().toISOString(),
      images,
    };

    const manifestPath = path.join(this.manifestDir, `${productId}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }
}
