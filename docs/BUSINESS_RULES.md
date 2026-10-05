# BUSINESS_RULES

# ==========================================================
# GIL IMPORTS
# REGRAS DE NEGÓCIO
# ==========================================================

Versão: 2.0

Este documento define todas as regras de funcionamento da loja.

Caso exista conflito entre implementação e este documento,
este documento possui prioridade.

==========================================================

# OBJETIVO

ERP leve para administrar uma loja física com loja virtual integrada.

Pensado para operação diária com poucos cliques.

==========================================================

# USUÁRIOS

Roles: ADMIN e EMPLOYEE.

A tabela suporta múltiplos usuários.

Hoje existem 2 usuários (Administrador e Funcionária).

Permissões operacionais idênticas para ambos:

Cadastrar/editar produtos, categorias, marcas, clientes, pedidos.
Controlar estoque, separar pedidos, registrar vendas, visualizar dashboard.

Somente ADMIN acessa:

cost_price, lucro, margem, faturamento.

O backend deve bloquear esses dados para EMPLOYEE (não apenas ocultar na UI).

==========================================================

# ESTOQUE

Existe apenas UM estoque compartilhado entre:

Loja Física, WhatsApp, Instagram, Site.

Toda movimentação deve ser registrada.

Nunca alterar estoque manualmente no banco.

Nunca permitir estoque negativo.

Nunca vender acima do estoque disponível (available = stock - reserved_stock).

Estoque reservado (reserved_stock):

Reserva quantidade enquanto pagamento online está pendente.

Pedido AGUARDANDO_PAGAMENTO → reserved_stock += quantidade.

Pagamento confirmado (webhook PagBank) → stock -= quantidade, reserved_stock -= quantidade.

Pagamento expirado ou cancelado → reserved_stock -= quantidade (stock inalterado).

Pedidos presenciais (LOCAL, PAGO) baixam stock diretamente, sem reserva.

Estoque mínimo (min_stock):

Sem valor fixo no banco.

Ao cadastrar produto, min_stock recebe settings.default_min_stock.

Cada produto pode ter min_stock próprio posteriormente.

Não haverá controle de materiais internos ou almoxarifado.

Tipos de movimentação:

ENTRADA, VENDA, TROCA, PERDA, DEVOLUCAO, AJUSTE.

Sempre registrar: data, usuário, motivo, quantidade, produto.

==========================================================

# PRODUTOS

Campos obrigatórios desde a v1:

id, sku, barcode (opcional), slug, name, description,
price, sale_price, cost_price, stock, category, brand,
active, featured, images, created_at, updated_at.

Status via campo is_active (true/false).

Destaque via campo is_featured (true/false).

Produto inativo não aparece na loja virtual.

Produto sem estoque continua visível, mas não pode ser comprado.

Cadastro totalmente genérico (produtos importados diversos).

Promoção apenas via sale_price (nunca maior que price).

==========================================================

# CATEGORIAS E MARCAS

Cada produto pertence a uma categoria e uma marca.

Categorias possuem: nome, slug, imagem, ordem, status.

Marcas possuem: nome, slug, status.

==========================================================

# CLIENTES

Sem CRM. Dados mínimos para operação:

Nome, Telefone, Email, CPF (opcional),
Endereço, Cidade, Bairro, CEP, Referência.

Utilizados para: contato, entrega, histórico de pedidos.

==========================================================

# PEDIDOS

Origem (origin):

LOCAL — venda presencial
ONLINE — venda remota

Canal (channel):

LOJA_FISICA, SITE, WHATSAPP, INSTAGRAM

Exemplos:

LOCAL + LOJA_FISICA
ONLINE + SITE
ONLINE + WHATSAPP
ONLINE + INSTAGRAM

Todos utilizam o mesmo fluxo, estoque, produtos e clientes.

Status:

CRIADO
→ AGUARDANDO_PAGAMENTO (pedidos online via PagBank)
→ PAGO
→ SEPARANDO
→ PRONTO_PARA_ENTREGA
→ ENTREGUE
→ CANCELADO

Pedidos presenciais (LOCAL) normalmente entram direto como PAGO.

Pedidos online (SITE) passam por AGUARDANDO_PAGAMENTO até confirmação PagBank.

Pedidos WhatsApp/Instagram (ONLINE) podem entrar como PAGO (pagamento externo).

Ao cancelar: restaurar estoque e registrar histórico.

Ao confirmar pagamento: reduzir estoque e registrar movimentação VENDA.

==========================================================

# PAGAMENTOS

Loja física: PIX, dinheiro, cartão — fora do sistema.

Loja virtual: Asaas (PIX, cartão, boleto).

Fluxo online:

Pedido criado → Cobrança Asaas → Webhook → Pagamento confirmado
→ Pedido PAGO → Estoque reduzido.

==========================================================

# PROMOÇÕES

Eliminados: cupons, campanhas, cashback, fidelidade, pontos.

Promoção apenas via price e sale_price no produto.

Desconto de 6 peças (loja física) NÃO será implementado na v1.

==========================================================

# FINANCEIRO

Sem módulo financeiro completo.

Apenas cálculos automáticos para ADMIN:

lucro, margem, faturamento.

Sem fluxo de caixa, contas a pagar/receber, DRE ou livro caixa.

Lucro por item = (preço_venda - cost_price) × quantidade.

Margem = lucro / faturamento × 100.

==========================================================

# ENTREGA

Retirada na loja e entrega local.

Sem integração Correios/transportadoras na v1.

==========================================================

# DASHBOARD

Todos os usuários veem:

Pedidos hoje, Vendas hoje, Faturamento hoje,
Produtos com estoque baixo, Produtos sem estoque,
Pedidos aguardando separação, Últimos pedidos.

Somente ADMIN vê adicionalmente:

Lucro e Margem.

Nota: faturamento hoje é visível para todos; lucro/margem apenas ADMIN.

==========================================================

# PRINCÍPIO

Simplicidade acima de tudo.

Qualquer funcionário deve aprender a usar o sistema em poucos minutos.
