-- Preserva pedidos existentes e registra o identificador estável da cotação
-- escolhida no checkout. O nome legado continua disponível para histórico.
ALTER TABLE "Order" ADD COLUMN "shippingOptionId" TEXT;