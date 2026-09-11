import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(@Req() req: any, @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: CreateOrderDto) {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create orders');
    }
    return this.ordersService.create(req.user.id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findAll(@Req() req: any) {
    return this.ordersService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(req.user, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async remove(@Req() req: any, @Param('id') id: string) {
    void req;
    void id;
    throw new ForbiddenException('Orders are historical records and cannot be deleted.');
  }
}
