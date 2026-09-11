import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DeliveryMethod } from '@prisma/client';

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsEnum(DeliveryMethod)
  method!: DeliveryMethod;
}
