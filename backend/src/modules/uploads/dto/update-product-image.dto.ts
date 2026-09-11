import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateProductImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  alt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
