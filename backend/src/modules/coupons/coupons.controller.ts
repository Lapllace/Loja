import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.couponsService.create();
  }

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.couponsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove();
  }
}
