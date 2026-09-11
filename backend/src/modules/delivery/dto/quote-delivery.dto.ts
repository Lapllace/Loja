import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliveryMethod } from '@prisma/client';

export class QuoteDeliveryDto {
  @IsEnum(DeliveryMethod)
  method!: DeliveryMethod;

  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
