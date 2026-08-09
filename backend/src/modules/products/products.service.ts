import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (data.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
      if (!brand) {
        throw new BadRequestException('Brand not found');
      }
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          slug: data.slug,
          description: data.description,
          shortDescription: data.shortDescription,
          price: data.price,
          comparePrice: data.comparePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          active: data.active,
          featured: data.featured,
          weight: data.weight,
          width: data.width,
          height: data.height,
          length: data.length,
          categoryId: data.categoryId,
          brandId: data.brandId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          price: true,
          comparePrice: true,
          costPrice: true,
          stock: true,
          active: true,
          featured: true,
          weight: true,
          width: true,
          height: true,
          length: true,
          categoryId: true,
          brandId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return product;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Product sku or slug already in use');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        price: true,
        comparePrice: true,
        stock: true,
        active: true,
        featured: true,
        weight: true,
        width: true,
        height: true,
        length: true,
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        price: true,
        comparePrice: true,
        stock: true,
        active: true,
        featured: true,
        weight: true,
        width: true,
        height: true,
        length: true,
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    if (data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    if (data.brandId !== undefined) {
      if (data.brandId) {
        const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
        if (!brand) {
          throw new BadRequestException('Brand not found');
        }
      }
    }

    const updateData: any = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.comparePrice !== undefined) updateData.comparePrice = data.comparePrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.length !== undefined) updateData.length = data.length;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.brandId !== undefined) updateData.brandId = data.brandId;

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          price: true,
          comparePrice: true,
          stock: true,
          active: true,
          featured: true,
          weight: true,
          width: true,
          height: true,
          length: true,
          categoryId: true,
          brandId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return product;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Product not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Product sku or slug already in use');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const orderItemsCount = await this.prisma.orderItem.count({ where: { productId: id } });
    if (orderItemsCount > 0) {
      throw new ConflictException('Cannot delete product with linked order items');
    }

    const cartItemsCount = await this.prisma.cartItem.count({ where: { productId: id } });
    if (cartItemsCount > 0) {
      throw new ConflictException('Cannot delete product with linked cart items');
    }

    const reviewsCount = await this.prisma.review.count({ where: { productId: id } });
    if (reviewsCount > 0) {
      throw new ConflictException('Cannot delete product with linked reviews');
    }

    const wishlistCount = await this.prisma.wishlist.count({ where: { productId: id } });
    if (wishlistCount > 0) {
      throw new ConflictException('Cannot delete product with linked wishlists');
    }

    const stockMovementsCount = await this.prisma.stockMovement.count({ where: { productId: id } });
    if (stockMovementsCount > 0) {
      throw new ConflictException('Cannot delete product with linked stock movements');
    }

    await this.prisma.product.delete({ where: { id } });
    return { id };
  }
}
