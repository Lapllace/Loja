import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PagBankService } from './pagbank.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PagBankService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
