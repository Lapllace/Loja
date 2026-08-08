import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.cartsService.create();
  }

  @Get()
  findAll() {
    return this.cartsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cartsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.cartsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cartsService.remove();
  }
}
