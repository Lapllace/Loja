import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.authService.create();
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.authService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove();
  }
}
