import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AddressesService } from './addresses.service';
import { AddressType } from '@prisma/client';

const userId = 'user-123';
const addressId = 'address-123';

const addressMock = {
  id: addressId,
  userId,
  nickname: 'Home',
  recipient: 'John Doe',
  zipcode: '01001000',
  street: 'Rua A',
  number: '123',
  complement: 'Apto 1',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  reference: 'Perto do mercado',
  type: AddressType.SHIPPING,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  address: {
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AddressesService', () => {
  let service: AddressesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  it('should create first SHIPPING address as default when isDefault is not provided', async () => {
    prismaMock.address.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (args: any) => {
      if (typeof args === 'function') {
        return args(prismaMock);
      }
      return args;
    });
    prismaMock.address.create.mockResolvedValue(addressMock);

    const result = await service.create(userId, {
      recipient: 'John Doe',
      zipcode: '01001-000',
      street: 'Rua A',
      number: '123',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });

    expect(prismaMock.address.count).toHaveBeenCalledWith({
      where: { userId, type: AddressType.SHIPPING },
    });
    expect(prismaMock.address.updateMany).toHaveBeenCalledWith({
      where: { userId, type: AddressType.SHIPPING, isDefault: true },
      data: { isDefault: false },
    });
    expect(prismaMock.address.create).toHaveBeenCalledWith({
      data: {
        userId,
        nickname: undefined,
        recipient: 'John Doe',
        zipcode: '01001000',
        street: 'Rua A',
        number: '123',
        complement: undefined,
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        reference: undefined,
        type: AddressType.SHIPPING,
        isDefault: true,
      },
      select: expect.any(Object),
    });
    expect(result).toEqual(addressMock);
  });

  it('should return only the user addresses', async () => {
    prismaMock.address.findMany.mockResolvedValue([addressMock]);

    const result = await service.findAll(userId);

    expect(prismaMock.address.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: expect.any(Object),
    });
    expect(result).toEqual([addressMock]);
  });

  it('should return own address by id', async () => {
    prismaMock.address.findFirst.mockResolvedValue(addressMock);

    const result = await service.findOne(userId, addressId);

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: { id: addressId, userId },
      select: expect.any(Object),
    });
    expect(result).toEqual(addressMock);
  });

  it('should throw 404 when trying to access another user address', async () => {
    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(service.findOne(userId, addressId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update own address', async () => {
    const updated = {
      ...addressMock,
      street: 'Rua B',
      number: '456',
      updatedAt: new Date(),
    };
    prismaMock.address.findFirst.mockResolvedValue(addressMock);
    prismaMock.address.update.mockResolvedValue(updated);

    const result = await service.update(userId, addressId, {
      street: 'Rua B',
      number: '456',
    });

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: { id: addressId, userId },
    });
    expect(prismaMock.address.update).toHaveBeenCalledWith({
      where: { id: addressId },
      data: { street: 'Rua B', number: '456' },
      select: expect.any(Object),
    });
    expect(result).toEqual(updated);
  });

  it('should throw 404 when updating another user address', async () => {
    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(
      service.update(userId, addressId, { city: 'Rio' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should delete own non-default address', async () => {
    const nonDefault = { ...addressMock, isDefault: false };
    prismaMock.address.findFirst.mockResolvedValue(nonDefault);
    prismaMock.address.delete.mockResolvedValue({ id: addressId });

    const result = await service.remove(userId, addressId);

    expect(prismaMock.address.delete).toHaveBeenCalledWith({
      where: { id: addressId },
    });
    expect(result).toEqual({ id: addressId });
  });

  it('should throw 404 when deleting another user address', async () => {
    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(service.remove(userId, addressId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should promote another address to default when deleting the default address', async () => {
    const replacement = { ...addressMock, id: 'address-456', isDefault: false };
    prismaMock.address.findFirst
      .mockResolvedValueOnce(addressMock)
      .mockResolvedValueOnce(replacement);
    prismaMock.address.delete.mockResolvedValue({ id: addressId });
    prismaMock.address.update.mockResolvedValue({
      ...replacement,
      isDefault: true,
    });

    const result = await service.remove(userId, addressId);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: addressId });
  });

  it('should set an address as default using setDefault endpoint', async () => {
    prismaMock.address.findFirst.mockResolvedValue(addressMock);
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(prismaMock),
    );
    prismaMock.address.update.mockResolvedValue({
      ...addressMock,
      isDefault: true,
    });

    const result = await service.setDefault(userId, addressId);

    expect(prismaMock.address.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        type: addressMock.type,
        isDefault: true,
        NOT: { id: addressId },
      },
      data: { isDefault: false },
    });
    expect(prismaMock.address.update).toHaveBeenCalledWith({
      where: { id: addressId },
      data: { isDefault: true },
      select: service['addressSelect'],
    });
    expect(result.isDefault).toBe(true);
  });
});
