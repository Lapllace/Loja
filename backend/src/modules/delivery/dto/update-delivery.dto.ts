import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { DeliveryStatus } from '@prisma/client';

export class UpdateDeliveryDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  courierName?: string;

  @IsOptional()
  @IsString()
  courierPhone?: string;

  @IsOptional()
  @IsString()
  trackingCode?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}
