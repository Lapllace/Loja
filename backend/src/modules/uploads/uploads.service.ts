import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { writeFile } from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import {
  buildFileName,
  ensureUploadsDir,
  MAX_UPLOAD_BYTES,
  resolveStoredFile,
  toPublicUrl,
} from './storage.constants';

/** Resultado do armazenamento de um arquivo de imagem. */
export interface StoredImage {
  /** URL pública relativa, pronta para gravar em ProductImage.url. */
  url: string;
  /** Nome do arquivo gerado no disco. */
  fileName: string;
  size: number;
}

const ALLOWED_DOWNLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Salva um arquivo já recebido pelo Multer na pasta estática /uploads. */
  storeUploadedFile(file: Express.Multer.File): StoredImage {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return {
      url: toPublicUrl(file.filename),
      fileName: file.filename,
      size: file.size,
    };
  }

  /**
   * Baixa uma imagem de uma URL externa e grava em /uploads.
   * Usado pelo endpoint POST /products/upload-url.
   */
  async storeImageFromUrl(imageUrl: string): Promise<StoredImage> {
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new BadRequestException('imageUrl must be a valid URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('imageUrl must use http or https');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Could not download image (status ${response.status})`,
        );
      }

      const contentType = (response.headers.get('content-type') ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();

      if (!ALLOWED_DOWNLOAD_MIME.has(contentType)) {
        throw new BadRequestException(
          `The URL does not point to a supported image (received '${contentType || 'unknown'}')`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.byteLength === 0) {
        throw new BadRequestException('Downloaded image is empty');
      }
      if (buffer.byteLength > MAX_UPLOAD_BYTES) {
        throw new BadRequestException(
          `Image exceeds the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`,
        );
      }

      const fileName = buildFileName(
        parsed.pathname.split('/').pop() ?? 'image',
        contentType,
      );
      const destination = resolveStoredFile(fileName);

      ensureUploadsDir();
      await writeFile(destination, buffer);

      return {
        url: toPublicUrl(fileName),
        fileName,
        size: buffer.byteLength,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(`Failed to download image from ${imageUrl}`, error);
      throw new ServiceUnavailableException(
        'Could not download the image from the provided URL',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async create(productId: string, data: CreateProductImageDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // determine position if not provided -> append to end
    let position = data.position;
    if (position === undefined || position === null) {
      const maxPos = await this.prisma.productImage.aggregate({
        where: { productId },
        _max: { position: true },
      });
      position = (maxPos._max.position ?? -1) + 1;
    }

    const created = await this.prisma.productImage.create({
      data: {
        url: data.url,
        alt: data.alt,
        position,
        productId,
      },
    });
    return created;
  }

  async findAll(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }
    return image;
  }

  async update(
    productId: string,
    imageId: string,
    data: UpdateProductImageDto,
  ) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }

    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.alt !== undefined) updateData.alt = data.alt;
    if (data.position !== undefined) updateData.position = data.position;

    const updated = await this.prisma.productImage.update({
      where: { id: imageId },
      data: updateData,
    });
    return updated;
  }

  async remove(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { id: imageId };
  }
}
