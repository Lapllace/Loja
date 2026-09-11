import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeliveryQuoteResponse, DeliveryService } from './delivery.service';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('quote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  quote(
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: QuoteDeliveryDto,
  ): Promise<DeliveryQuoteResponse> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can quote delivery');
    }
    return this.deliveryService.quote(req.user, body);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  create(@Req() req: any, @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: CreateDeliveryDto) {
    return this.deliveryService.create(req.user, body);
  }

  @Post(':id/authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  authorize(@Req() req: any, @Param('id') id: string) {
    return this.deliveryService.authorize(req.user, id);
  }

  @Get('pending-authorization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  getPendingAuthorization(@Req() req: any) {
    return this.deliveryService.getPendingAuthorization(req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findAll(@Req() req: any) {
    return this.deliveryService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.deliveryService.findOne(req.user, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(@Req() req: any, @Param('id') id: string, @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) body: UpdateDeliveryDto) {
    return this.deliveryService.update(req.user, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.deliveryService.remove(req.user, id);
  }

  @Post('webhooks/uber')
  async uberWebhook(@Req() req: any) {
    return this.deliveryService.handleUberWebhook(req.rawBody ?? req.body, req.headers ?? {});
  }

  @Post('webhooks/ninenine')
  async ninetyNineWebhook(@Req() req: any) {
    return this.deliveryService.handleNinetyNineWebhook(req.rawBody ?? req.body, req.headers ?? {});
  }
}
