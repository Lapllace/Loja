import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.uploadsService.create();
  }

  @Get()
  findAll() {
    return this.uploadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.uploadsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.uploadsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.uploadsService.remove();
  }
}
