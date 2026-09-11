import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { PrismaModule } from '../../database/prisma.module';
import { UberDirectService } from './providers/uber-direct.service';
import { NinetyNineService } from './providers/ninety-nine.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, UberDirectService, NinetyNineService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
