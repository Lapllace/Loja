import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CalculateShippingDto {
  /** CEP de destino sem formatação (8 dígitos). */
  @Matches(/^\d{8}$/, {
    message: 'zipcode must be an 8 digit number',
  })
  zipcode!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ShippingItemDto)
  items!: ShippingItemDto[];
}
