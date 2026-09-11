import { IsOptional, IsString } from 'class-validator';

export class PagBankWebhookDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;
}
