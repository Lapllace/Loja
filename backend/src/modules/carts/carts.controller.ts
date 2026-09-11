import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('api/cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCart(@Req() req: any) {
    const userId = req.user?.id;
    return this.cartsService.getCartByUser(userId);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  async addItem(@Req() req: any, @Body() body: AddCartItemDto) {
    // disallow client-written fields
    const forbidden = ['userId', 'cartId', 'price', 'product'];
    for (const f of forbidden) {
      if (Object.prototype.hasOwnProperty.call(body as any, f)) {
        throw new BadRequestException(`${f} cannot be provided`);
      }
    }
    const userId = req.user?.id;
    return this.cartsService.addItem(userId, body);
  }

  @Patch('items/:productId')
  @UseGuards(JwtAuthGuard)
  async updateItem(@Req() req: any, @Param('productId') productId: string, @Body() body: UpdateCartItemDto) {
    const forbidden = ['userId', 'cartId', 'product', 'price'];
    for (const f of forbidden) {
      if (Object.prototype.hasOwnProperty.call(body as any, f)) {
        throw new BadRequestException(`${f} cannot be provided`);
      }
    }
    const userId = req.user?.id;
    return this.cartsService.updateItem(userId, productId, body);
  }

  @Delete('items/:productId')
  @UseGuards(JwtAuthGuard)
  async removeItem(@Req() req: any, @Param('productId') productId: string) {
    const userId = req.user?.id;
    return this.cartsService.removeItem(userId, productId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async clearCart(@Req() req: any) {
    const userId = req.user?.id;
    return this.cartsService.clearCart(userId);
  }
}
