import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto) {
    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    try {
      const category = await this.prisma.category.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          parentId: data.parentId,
          imageUrl: data.imageUrl,
          active: data.active,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          parentId: true,
          imageUrl: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return category;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Category name or slug already in use');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        imageUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        imageUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        imageUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, data: UpdateCategoryDto) {
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new BadRequestException(
          'parentId cannot reference the category itself',
        );
      }
      if (data.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new BadRequestException('Parent category not found');
        }
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.active !== undefined) updateData.active = data.active;

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          parentId: true,
          imageUrl: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return category;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Category name or slug already in use');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException('Cannot delete category with subcategories');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Cannot delete category with linked products',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
