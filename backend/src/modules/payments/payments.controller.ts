import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.paymentsService.create();
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.paymentsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove();
  }
}
