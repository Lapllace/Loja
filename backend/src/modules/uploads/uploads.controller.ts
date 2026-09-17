import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('products/:productId/images')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async create(
    @Param('productId') productId: string,
    @Body() body: CreateProductImageDto,
  ) {
    // disallowed fields
    if (
      Object.prototype.hasOwnProperty.call(body as any, 'id') ||
      Object.prototype.hasOwnProperty.call(body as any, 'productId') ||
      Object.prototype.hasOwnProperty.call(body as any, 'createdAt')
    ) {
      throw new BadRequestException(
        'id, productId and createdAt cannot be provided',
      );
    }
    return this.uploadsService.create(productId, body);
  }

  @Get()
  async findAll(@Param('productId') productId: string) {
    return this.uploadsService.findAll(productId);
  }

  @Patch(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async update(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() body: UpdateProductImageDto,
  ) {
    if (
      Object.prototype.hasOwnProperty.call(body as any, 'id') ||
      Object.prototype.hasOwnProperty.call(body as any, 'productId') ||
      Object.prototype.hasOwnProperty.call(body as any, 'createdAt')
    ) {
      throw new BadRequestException(
        'id, productId and createdAt cannot be provided',
      );
    }
    return this.uploadsService.update(productId, imageId, body);
  }

  @Delete(':imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async remove(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.uploadsService.remove(productId, imageId);
  }
}
