import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../../database/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
