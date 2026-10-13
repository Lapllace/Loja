import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param data     Campos do produto.
   * @param imageUrls URLs estáticas das imagens enviadas por upload
   *                  (a primeira vira a imagem principal).
   */
  async create(data: CreateProductDto, imageUrls: string[] = []) {
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (data.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: data.brandId },
      });
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
          ...(imageUrls.length > 0 && {
            images: {
              create: imageUrls.map((url, index) => ({
                url,
                alt: data.name,
                position: index,
              })),
            },
          }),
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
          images: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              url: true,
              alt: true,
              position: true,
              productId: true,
              createdAt: true,
            },
          },
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

  async findAll(query?: QueryProductDto) {
    const where: Record<string, unknown> = {};

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.brandId) {
      where.brandId = query.brandId;
    }
    if (query?.featured !== undefined) {
      where.featured = query.featured;
    }
    if (query?.active !== undefined) {
      where.active = query.active;
    }
    if (query?.inStock) {
      where.stock = { gt: 0 };
    }
    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderByField = query?.sortBy ?? 'name';
    const orderDirection = query?.order ?? 'asc';

    return this.prisma.product.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
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
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            productId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
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
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            productId: true,
            createdAt: true,
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
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
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            alt: true,
            position: true,
            productId: true,
            createdAt: true,
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  /**
   * @param imageUrls Quando enviadas, substituem as imagens atuais do produto
   *                  (a primeira passa a ser a imagem principal).
   * @param userId    ID do admin que está fazendo a alteração (para StockMovement).
   */
  async update(id: string, data: UpdateProductDto, imageUrls: string[] = [], userId?: string) {
    if (data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    if (data.brandId !== undefined) {
      if (data.brandId) {
        const brand = await this.prisma.brand.findUnique({
          where: { id: data.brandId },
        });
        if (!brand) {
          throw new BadRequestException('Brand not found');
        }
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.shortDescription !== undefined)
      updateData.shortDescription = data.shortDescription;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.comparePrice !== undefined)
      updateData.comparePrice = data.comparePrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.length !== undefined) updateData.length = data.length;
    // FKs escalares nao existem em ProductUpdateInput: usa-se connect.
    if (data.categoryId !== undefined) {
      updateData.category = { connect: { id: data.categoryId } };
    }
    if (data.brandId !== undefined) {
      updateData.brand = data.brandId
        ? { connect: { id: data.brandId } }
        : { disconnect: true };
    }

    // Novas imagens: substituem as anteriores ou respeitam keepImageIds.
    if (imageUrls.length > 0) {
      if (data.keepImageIds && data.keepImageIds.length > 0) {
        updateData.images = {
          deleteMany: { id: { notIn: data.keepImageIds } },
          create: imageUrls.map((url, index) => ({
            url,
            alt: data.name ?? undefined,
            position: (data.keepImageIds?.length ?? 0) + index,
          })),
        };
      } else if (data.keepImageIds !== undefined) {
        // keepImageIds is explicitly [] — delete all, then create new
        updateData.images = {
          deleteMany: {},
          create: imageUrls.map((url, index) => ({
            url,
            alt: data.name ?? undefined,
            position: index,
          })),
        };
      } else {
        // keepImageIds not provided — backward-compatible delete-all
        updateData.images = {
          deleteMany: {},
          create: imageUrls.map((url, index) => ({
            url,
            alt: data.name ?? undefined,
            position: index,
          })),
        };
      }
    }

    const productSelect = {
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
      images: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] as Prisma.ProductImageOrderByWithRelationInput[],
        select: {
          id: true,
          url: true,
          alt: true,
          position: true,
          productId: true,
          createdAt: true,
        },
      },
    } as const;

    try {
      // Keep stock read, write and movement in one SERIALIZABLE transaction.
      // PostgreSQL aborts conflicting writers; retrying then records the real
      // previous/current values instead of stale history.
      const desiredStock = data.stock;
      if (desiredStock !== undefined) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await this.prisma.$transaction(
              async (tx) => {
                const current = await tx.product.findUnique({
                  where: { id },
                  select: { stock: true },
                });
                if (!current) {
                  throw new NotFoundException('Product not found');
                }

                const updated = await tx.product.update({
                  where: { id },
                  data: updateData,
                  select: productSelect,
                });
                const delta = desiredStock - current.stock;
                if (delta !== 0) {
                  await tx.stockMovement.create({
                    data: {
                      productId: id,
                      type: StockMovementType.ADJUSTMENT,
                      quantity: Math.abs(delta),
                      previousStock: current.stock,
                      currentStock: desiredStock,
                      reason: 'Admin manual adjustment',
                      ...(userId ? { createdById: userId } : {}),
                    },
                  });
                }
                return updated;
              },
              { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            );
          } catch (err: any) {
            if (err?.code !== 'P2034' || attempt === 2) throw err;
          }
        }
      }

      // No stock change — plain update.
      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
        select: productSelect,
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

    const orderItemsCount = await this.prisma.orderItem.count({
      where: { productId: id },
    });
    if (orderItemsCount > 0) {
      throw new ConflictException(
        'Cannot delete product with linked order items',
      );
    }

    const cartItemsCount = await this.prisma.cartItem.count({
      where: { productId: id },
    });
    if (cartItemsCount > 0) {
      throw new ConflictException(
        'Cannot delete product with linked cart items',
      );
    }

    const reviewsCount = await this.prisma.review.count({
      where: { productId: id },
    });
    if (reviewsCount > 0) {
      throw new ConflictException('Cannot delete product with linked reviews');
    }

    const wishlistCount = await this.prisma.wishlist.count({
      where: { productId: id },
    });
    if (wishlistCount > 0) {
      throw new ConflictException(
        'Cannot delete product with linked wishlists',
      );
    }

    const stockMovementsCount = await this.prisma.stockMovement.count({
      where: { productId: id },
    });
    if (stockMovementsCount > 0) {
      throw new ConflictException(
        'Cannot delete product with linked stock movements',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { id };
  }
}
