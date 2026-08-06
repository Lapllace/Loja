# FEATURES

# ==========================================================
# GIL IMPORTS
# FUNCIONALIDADES
# ==========================================================

Versão: 2.0

Escopo da primeira versão (MVP).

Funcionalidades futuras estão listadas ao final, mas NÃO fazem parte do MVP.

==========================================================

# PAINEL OPERACIONAL (Admin + Funcionário)

Dashboard

Produtos

Categorias

Marcas

Pedidos

Clientes

Estoque

Configurações básicas

==========================================================

# DASHBOARD

Pedidos hoje

Vendas hoje

Faturamento hoje

Produtos com estoque baixo

Produtos sem estoque

Pedidos aguardando separação

Últimos pedidos

Somente ADMIN:

Lucro

Margem

==========================================================

# PRODUTOS

Cadastrar, editar, listar, desativar (soft delete)

Campos: sku, barcode, slug, name, description, price, sale_price,
cost_price (Admin), stock, category, brand, active, featured, images

Alterar estoque via movimentações (nunca direto)

Duplicar produto

==========================================================

# CATEGORIAS E MARCAS

CRUD simples com imagem (categorias) e slug

==========================================================

# PEDIDOS

Criar pedido manual (loja física, WhatsApp, Instagram)

Listar, filtrar, pesquisar

Alterar status em 1 clique

Cancelar (restaura estoque)

Campos origin + channel

Impressão simples (futuro próximo)

==========================================================

# CLIENTES

Cadastrar, editar, listar

Dados mínimos (sem CRM)

Histórico de pedidos por cliente

==========================================================

# ESTOQUE

Visualizar estoque atual

Registrar entrada, saída, ajuste, troca, perda, devolução

Histórico de movimentações

Alerta de estoque baixo

==========================================================

# LOJA VIRTUAL (Site)

Home (banner, categorias, destaques)

Listagem de produtos com busca e filtros

Página do produto

Carrinho (localStorage)

Checkout com dados do cliente e entrega

Pagamento via Asaas (PIX, cartão, boleto)

Confirmação de pedido

==========================================================

# AUTENTICAÇÃO

Login JWT

Refresh Token

2 roles: ADMIN, EMPLOYEE

Suporte a múltiplos usuários

==========================================================

# PAGAMENTO ONLINE

Integração Asaas

Webhook de confirmação

Suporte PIX, cartão e boleto

==========================================================

# UPLOADS

Imagens locais em storage/

products/, categories/, brands/, avatars/, temp/

==========================================================

# FORA DO ESCOPO DA V1

Cupons e campanhas

Cashback e fidelidade

CRM avançado

Módulo financeiro completo

Materiais internos / almoxarifado

Import/export CSV

Dark mode

Integrações Mercado Livre, Shopee, Correios

App mobile nativo

Conta de cliente com login

Lista de desejos

Sistema de avaliações

Notificações push

Parcelamento exibido na loja (sem cartão próprio)

Docker durante desenvolvimento

==========================================================

# OBJETIVO

ERP leve, rápido e confiável.

Facilitar o dia a dia da Gil Imports.
