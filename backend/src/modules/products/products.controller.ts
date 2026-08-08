import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.productsService.create();
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.productsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove();
  }
}
