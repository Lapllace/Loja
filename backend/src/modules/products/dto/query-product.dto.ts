import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ProductSortField {
  NAME = 'name',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  STOCK = 'stock',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsEnum(ProductSortField)
  sortBy?: ProductSortField;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
