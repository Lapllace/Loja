import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
