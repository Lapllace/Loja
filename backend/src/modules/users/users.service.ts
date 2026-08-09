import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const iterations = 310000;
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    return `${iterations}:${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    try {
      const [iterationsStr, salt, key] = stored.split(':');
      const iterations = parseInt(iterationsStr, 10);
      const derived = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
      const keyBuf = Buffer.from(key, 'hex');
      const derivedBuf = Buffer.from(derived, 'hex');
      if (keyBuf.length !== derivedBuf.length) return false;
      return timingSafeEqual(keyBuf, derivedBuf);
    } catch (e) {
      return false;
    }
  }

  private publicUser(user: any) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async create(data: CreateUserDto & { role?: UserRole }) {
    const { name, email, password, phone, cpf, role } = data;
    const passwordHash = this.hashPassword(password);
    const createData: any = {
      name,
      email,
      passwordHash,
      phone,
      cpf,
    };
    if (role) createData.role = role;
    try {
      const user = await this.prisma.user.create({
        data: createData,
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (err: any) {
      // Prisma unique constraint error code
      if (err.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    const { password, email, name, phone, cpf } = data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (cpf !== undefined) updateData.cpf = cpf;
    if (password !== undefined) {
      updateData.passwordHash = this.hashPassword(password);
    }
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async updateRoleStatus(id: string, data: { role?: UserRole; status?: UserStatus }) {
    const updateData: any = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      return user;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = this.verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
