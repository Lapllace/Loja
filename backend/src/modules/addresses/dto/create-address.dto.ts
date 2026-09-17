import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AddressType } from '@prisma/client';

const BRAZILIAN_UF =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  recipient: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^\d{8}$/, {
    message: 'zipcode must be a valid Brazilian CEP with 8 digits',
  })
  zipcode: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  street: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  complement?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  district: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  city: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  @Matches(BRAZILIAN_UF, {
    message: 'state must be a valid Brazilian UF',
  })
  state: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
