import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { AddressType } from '@prisma/client';

const userId = 'user-123';
const addressId = 'address-123';

const addressMock = {
  id: addressId,
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

const req = { user: { id: userId } };

const addressesServiceMock = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setDefault: jest.fn(),
};

describe('AddressesController', () => {
  let controller: AddressesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        { provide: AddressesService, useValue: addressesServiceMock },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    jest.clearAllMocks();
  });

  it('should list own addresses', async () => {
    addressesServiceMock.findAll.mockResolvedValue([addressMock]);

    const result = await controller.findAll(req as any);

    expect(addressesServiceMock.findAll).toHaveBeenCalledWith(userId);
    expect(result).toEqual([addressMock]);
  });

  it('should get own address by id', async () => {
    addressesServiceMock.findOne.mockResolvedValue(addressMock);

    const result = await controller.findOne(req as any, addressId);

    expect(addressesServiceMock.findOne).toHaveBeenCalledWith(userId, addressId);
    expect(result).toEqual(addressMock);
  });

  it('should create address using auth user id', async () => {
    addressesServiceMock.create.mockResolvedValue(addressMock);

    const result = await controller.create(req as any, {
      recipient: 'John Doe',
      zipcode: '01001-000',
      street: 'Rua A',
      number: '123',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    } as any);

    expect(addressesServiceMock.create).toHaveBeenCalledWith(userId, expect.any(Object));
    expect(result).toEqual(addressMock);
  });

  it('should update own address', async () => {
    addressesServiceMock.update.mockResolvedValue(addressMock);

    const result = await controller.update(req as any, addressId, { city: 'Rio de Janeiro' } as any);

    expect(addressesServiceMock.update).toHaveBeenCalledWith(userId, addressId, expect.any(Object));
    expect(result).toEqual(addressMock);
  });

  it('should delete own address', async () => {
    addressesServiceMock.remove.mockResolvedValue({ id: addressId });

    const result = await controller.remove(req as any, addressId);

    expect(addressesServiceMock.remove).toHaveBeenCalledWith(userId, addressId);
    expect(result).toEqual({ id: addressId });
  });

  it('should set default address', async () => {
    addressesServiceMock.setDefault.mockResolvedValue(addressMock);

    const result = await controller.setDefault(req as any, addressId);

    expect(addressesServiceMock.setDefault).toHaveBeenCalledWith(userId, addressId);
    expect(result).toEqual(addressMock);
  });
});
