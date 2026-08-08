import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  create() {}
  findAll() {}
  findOne() {}
  update() {}
  remove() {}
}
