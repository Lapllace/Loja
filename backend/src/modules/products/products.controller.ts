import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { MulterField } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ProductsService } from './products.service';
import { UploadsService } from '../uploads/uploads.service';
import { UploadUrlDto } from '../uploads/dto/upload-url.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { productImageMulterOptions } from '../uploads/storage.constants';

/**
 * Campos de multipart aceitos no cadastro/edicao de produto.
 *
 * Usamos UM UNICO FileFieldsInterceptor com esta lista em vez de empilhar
 * FilesInterceptor('images') + FileInterceptor('image'): cada interceptor do
 * Multer tem configuracao propria de campos e o primeiro a rodar rejeitava o
 * campo do outro com "Unexpected field - image" (HTTP 400).
 */
const PRODUCT_IMAGE_FIELDS: MulterField[] = [
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 },
];

/**
 * Achata o objeto devolvido pelo FileFieldsInterceptor em uma lista de arquivos.
 * Convencao: a imagem principal (`image`) vem primeiro, seguida das adicionais
 * (`images`), para que ProductsService use a primeira como ProductImage de
 * position 0.
 */
function flattenUploadedImages(uploaded?: {
  image?: Express.Multer.File[];
  images?: Express.Multer.File[];
}): Express.Multer.File[] {
  return [...(uploaded?.image ?? []), ...(uploaded?.images ?? [])];
}

/** Converte os campos de multipart (sempre strings) para os tipos do DTO. */
function coerceProductBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const numericFields = [
    'price',
    'comparePrice',
    'costPrice',
    'stock',
    'weight',
    'width',
    'height',
    'length',
  ];
  const booleanFields = ['active', 'featured'];

  const result: Record<string, unknown> = { ...body };

  for (const field of numericFields) {
    const value = result[field];
    if (typeof value === 'string') {
      const parsed = value.trim() === '' ? undefined : Number(value);
      result[field] = Number.isFinite(parsed) ? parsed : value;
    }
  }

  for (const field of booleanFields) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = value === 'true' || value === '1';
    } else if (value === undefined) {
      delete result[field];
    }
  }

  // Multipart envia strings vazias para campos opcionais não preenchidos.
  for (const key of Object.keys(result)) {
    if (result[key] === '') delete result[key];
  }

  const keepRaw = result.keepImageIds;
  if (typeof keepRaw === 'string') {
    try {
      result.keepImageIds = JSON.parse(keepRaw);
    } catch {
      result.keepImageIds = keepRaw ? [keepRaw] : [];
    }
  }

  return result;
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * Baixa uma imagem de uma URL externa e devolve a rota estática local.
   * Usado pelo campo "Cole a URL da Imagem" do painel administrativo.
   */
  @Post('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async uploadFromUrl(@Body() body: UploadUrlDto) {
    const stored = await this.uploadsService.storeImageFromUrl(body.imageUrl);
    return { url: stored.url, fileName: stored.fileName, size: stored.size };
  }

  /**
   * Cria um produto. Aceita JSON ou multipart/form-data:
   *  - campo `image`  → imagem principal (ProductImage position 0)
   *  - campo `images` → imagens adicionais (até 5)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(PRODUCT_IMAGE_FIELDS, productImageMulterOptions),
  )
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    uploaded?: { image?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const files = flattenUploadedImages(uploaded);
    const dto = coerceProductBody(body) as unknown as CreateProductDto;
    const stored = files.map((file) =>
      this.uploadsService.storeUploadedFile(file),
    );

    return this.productsService.create(
      dto,
      stored.map((s) => s.url),
    );
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /** Atualiza um produto, substituindo a imagem principal quando enviada. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(PRODUCT_IMAGE_FIELDS, productImageMulterOptions),
  )
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    uploaded?: { image?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const files = flattenUploadedImages(uploaded);
    const dto = coerceProductBody(body) as unknown as UpdateProductDto;
    const stored = files.map((file) =>
      this.uploadsService.storeUploadedFile(file),
    );

    return this.productsService.update(
      id,
      dto,
      stored.map((s) => s.url),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
