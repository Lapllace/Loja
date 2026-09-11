import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  async getCartByUser(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    const full = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
                price: true,
                comparePrice: true,
                active: true,
                stock: true,
                images: { select: { id: true, url: true, alt: true, position: true } },
              },
            },
          },
        },
      },
    });
    return full;
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const { productId, quantity } = dto;

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.active) throw new BadRequestException('Product is not active');
    if (quantity > product.stock) throw new BadRequestException('Insufficient stock');

    const cart = await this.findOrCreateCart(userId);

    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > product.stock) throw new BadRequestException('Insufficient stock');
      const updated = await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
      return updated;
    }

    try {
      const created = await this.prisma.cartItem.create({ data: { cartId: cart.id, userId, productId, quantity } });
      return created;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Cart item already exists');
      }
      throw err;
    }
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    const { quantity } = dto;
    const cart = await this.findOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (!item) throw new NotFoundException('Cart item not found');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.active) throw new BadRequestException('Product is not active');
    if (quantity > product.stock) throw new BadRequestException('Insufficient stock');

    const updated = await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return updated;
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.findOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return { id: item.id };
  }

  async clearCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const refreshed = await this.getCartByUser(userId);
    return refreshed;
  }
}
