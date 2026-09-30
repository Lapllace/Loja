-- AlterTable
-- Checkout: registra a opção de frete escolhida pelo cliente (nome exibido).
ALTER TABLE "Order" ADD COLUMN "shippingOptionName" TEXT;
