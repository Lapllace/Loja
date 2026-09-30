import { Global, Module } from '@nestjs/common';
import { MetaWhatsappService } from './meta-whatsapp.service';

/**
 * Módulo de notificações via WhatsApp (Meta Cloud API).
 *
 * `@Global()` para que `MetaWhatsappService` seja injetável em qualquer módulo
 * sem precisar importar `NotificationsModule` explicitamente em cada um.
 * `AppConfigModule` (global + ConfigModule.forRoot) já está registrado, então
 * `ConfigService` está disponível aqui sem precisar re-importar.
 */
@Global()
@Module({
  providers: [MetaWhatsappService],
  exports: [MetaWhatsappService],
})
export class NotificationsModule {}
