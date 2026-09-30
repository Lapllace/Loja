import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  /**
   * Frete escolhido no checkout (R$). Validado com teto alto apenas para
   * evitar valores absurdos — a cotação real vem da tela de checkout.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999.99)
  shipping?: number;

  /** Nome da opção de frete escolhida (ex.: "Motoboy / Entrega Local"). */
  @IsOptional()
  @IsString()
  @Length(0, 80)
  shippingOptionName?: string;
}
