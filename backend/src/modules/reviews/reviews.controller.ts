import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.reviewsService.create();
  }

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.reviewsService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove();
  }
}
