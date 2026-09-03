import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressType } from '@prisma/client';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly addressSelect = {
    id: true,
    nickname: true,
    recipient: true,
    zipcode: true,
    street: true,
    number: true,
    complement: true,
    district: true,
    city: true,
    state: true,
    reference: true,
    type: true,
    isDefault: true,
    createdAt: true,
    updatedAt: true,
  };

  private normalizeZipcode(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeState(value: string): string {
    return value.trim().toUpperCase();
  }

  async create(userId: string, data: CreateAddressDto) {
    const type = data.type ?? AddressType.SHIPPING;
    const existingCount = await this.prisma.address.count({ where: { userId, type } });
    const setAsDefault = data.isDefault === true || existingCount === 0;
    const zipcode = this.normalizeZipcode(data.zipcode);
    const state = this.normalizeState(data.state);

    return this.prisma.$transaction(async (tx) => {
      if (setAsDefault) {
        await tx.address.updateMany({
          where: { userId, type, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          nickname: data.nickname,
          recipient: data.recipient,
          zipcode,
          street: data.street,
          number: data.number,
          complement: data.complement,
          district: data.district,
          city: data.city,
          state,
          reference: data.reference,
          type,
          isDefault: setAsDefault,
        },
        select: this.addressSelect,
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: this.addressSelect,
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
      select: this.addressSelect,
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(userId: string, id: string, data: UpdateAddressDto) {
    const current = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!current) {
      throw new NotFoundException('Address not found');
    }

    const newType = data.type ?? current.type;
    const requiresDefaultUpdate =
      data.isDefault === true ||
      (current.isDefault && data.type !== undefined && data.type !== current.type);

    const updateData: any = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.recipient !== undefined) updateData.recipient = data.recipient;
    if (data.zipcode !== undefined) updateData.zipcode = this.normalizeZipcode(data.zipcode);
    if (data.street !== undefined) updateData.street = data.street;
    if (data.number !== undefined) updateData.number = data.number;
    if (data.complement !== undefined) updateData.complement = data.complement;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = this.normalizeState(data.state);
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    if (requiresDefaultUpdate) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId,
            type: newType,
            isDefault: true,
            NOT: { id },
          },
          data: { isDefault: false },
        });

        return tx.address.update({
          where: { id },
          data: updateData,
          select: this.addressSelect,
        });
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: updateData,
      select: this.addressSelect,
    });
  }

  async remove(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (!address.isDefault) {
      await this.prisma.address.delete({ where: { id } });
      return { id };
    }

    const replacement = await this.prisma.address.findFirst({
      where: { userId, type: address.type, id: { not: id } },
      orderBy: { createdAt: 'asc' },
    });

    if (!replacement) {
      await this.prisma.address.delete({ where: { id } });
      return { id };
    }

    await this.prisma.$transaction([
      this.prisma.address.delete({ where: { id } }),
      this.prisma.address.update({
        where: { id: replacement.id },
        data: { isDefault: true },
      }),
    ]);

    return { id };
  }

  async setDefault(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: {
          userId,
          type: address.type,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true },
        select: this.addressSelect,
      });
    });
  }
}
