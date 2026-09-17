import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBrandDto) {
    try {
      const brand = await this.prisma.brand.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          logoUrl: data.logoUrl,
          website: data.website,
          active: data.active,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          website: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return brand;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Brand name or slug already in use');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async update(id: string, data: UpdateBrandDto) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.active !== undefined) updateData.active = data.active;

    try {
      const brand = await this.prisma.brand.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          website: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return brand;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Brand not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Brand name or slug already in use');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const productCount = await this.prisma.product.count({
      where: { brandId: id },
    });
    if (productCount > 0) {
      throw new ConflictException('Cannot delete brand with linked products');
    }

    await this.prisma.brand.delete({ where: { id } });
    return { id };
  }
}
