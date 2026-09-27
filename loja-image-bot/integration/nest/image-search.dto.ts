import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class SearchProductImagesDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  productId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  variant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}

export class DownloadSelectedImagesDto extends SearchProductImagesDto {
  @IsArray()
  images!: Array<{
    id: string;
    title: string;
    source: string;
    sourceUrl: string;
    imageUrl: string;
    query: string;
  }>;
}
