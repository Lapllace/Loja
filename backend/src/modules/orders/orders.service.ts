import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create() {}
  findAll() {}
  findOne() {}
  update() {}
  remove() {}
}
