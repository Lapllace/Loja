import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(productId: string, data: CreateProductImageDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
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
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }
    return image;
  }

  async update(productId: string, imageId: string, data: UpdateProductImageDto) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }

    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.alt !== undefined) updateData.alt = data.alt;
    if (data.position !== undefined) updateData.position = data.position;

    const updated = await this.prisma.productImage.update({ where: { id: imageId }, data: updateData });
    return updated;
  }

  async remove(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { id: imageId };
  }
}
