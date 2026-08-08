import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.brandsService.create();
  }

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.brandsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandsService.remove();
  }
}
