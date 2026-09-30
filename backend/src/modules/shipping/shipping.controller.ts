import { Body, Controller, Post } from '@nestjs/common';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Cotação pública de frete (sem JWT): o checkout precisa calcular o prazo
   * antes do pedido existir e o payload não contém dados pessoais — apenas
   * CEP de destino e itens do carrinho.
   */
  @Post('calculate')
  calculate(@Body() body: CalculateShippingDto) {
    return this.shippingService.calculate(body);
  }
}
