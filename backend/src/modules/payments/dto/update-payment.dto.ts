import { IsEnum } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}
