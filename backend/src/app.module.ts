import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { CartsModule } from './modules/carts/carts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ImageSearchModule } from './modules/image-search/image-search.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    // Rate limiting: 100 requests per 60 seconds globally.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    NotificationsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    UploadsModule,
    PaymentsModule,
    AddressesModule,
    DeliveryModule,
    ImageSearchModule,
    ShippingModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally as APP_GUARD.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
