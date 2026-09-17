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
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(
    @Req() req: any,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreatePaymentDto,
  ) {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create payments');
    }
    return this.paymentsService.create(req.user, body);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  checkout(
    @Req() req: any,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CreatePaymentDto,
  ) {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create payments');
    }
    return this.paymentsService.create(req.user, body);
  }

  @Post('webhooks/pagbank')
  async pagbankWebhook(@Req() req: any) {
    const rawBody = req.rawBody ?? req.body;
    return this.paymentsService.handlePagBankWebhook(rawBody, req.headers);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findAll(@Req() req: any) {
    return this.paymentsService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.OWNER)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.paymentsService.findOne(req.user, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(req.user, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(@Req() req: any, @Param('id') id: string) {
    void req;
    void id;
    throw new ForbiddenException(
      'Payments are historical records and cannot be deleted.',
    );
  }
}
