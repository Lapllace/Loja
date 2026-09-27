import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * SEARCH — busca candidatas de imagem.
 *
 * Nao exige `productId`: a busca acontece ANTES de o produto existir (fluxo do
 * cadastro). Basta o termo de pesquisa. Os campos opcionais (brand/model/etc.)
 * so enriquecem a geracao de queries quando estiverem disponiveis no contexto.
 */
export class SearchProductImagesDto {
  /** Termo de pesquisa livre. Unico campo obrigatorio. */
  @IsString()
  @IsNotEmpty({ message: 'query is required' })
  @MaxLength(200, { message: 'query must be at most 200 characters' })
  query!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  variant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;
}

export class SelectedImageDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  sourceUrl!: string;

  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsString()
  @IsNotEmpty()
  query!: string;
}

export class DownloadSelectedImagesDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  variant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;

  @IsArray()
  @ArrayMaxSize(5, { message: 'at most 5 images can be selected' })
  @ValidateNested({ each: true })
  @Type(() => SelectedImageDto)
  images!: SelectedImageDto[];
}

/**
 * ADD-TO-PRODUCT — importa candidatas selecionadas para um produto que ACABOU
 * de ser criado (ou que ja existe, no caso da edicao).
 *
 * Mesmo contrato de DOWNLOAD; mantido separado para deixar explicito o uso no
 * fluxo do formulario de produto.
 */
export class ImportSelectedImagesDto extends DownloadSelectedImagesDto {}
