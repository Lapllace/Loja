# API

# ==========================================================
# GIL IMPORTS
# ESPECIFICAÇÃO DA API
# ==========================================================

Versão: 2.0

Base URL: /api/v1

Formato: REST, JSON

Autenticação: Bearer JWT (exceto rotas públicas)

==========================================================

# AUTH

POST   /auth/login          — Login (email + senha)
POST   /auth/logout         — Logout
POST   /auth/refresh        — Renovar token
GET    /auth/me             — Dados do usuário logado

==========================================================

# USERS (somente ADMIN)

GET    /users               — Listar usuários
POST   /users               — Criar usuário
GET    /users/:id           — Detalhe
PUT    /users/:id           — Atualizar
DELETE /users/:id           — Desativar (soft delete)

==========================================================

# PRODUCTS

GET    /products            — Listar (paginado, filtros)
GET    /products/:id        — Detalhe
POST   /products            — Criar
PUT    /products/:id        — Atualizar
DELETE /products/:id        — Desativar (soft delete)
POST   /products/:id/duplicate — Duplicar produto

Filtros: category, brand, search, active, featured, promotion (sale_price > 0)

Resposta para EMPLOYEE: sem cost_price.

Resposta para ADMIN: inclui cost_price.

==========================================================

# PRODUCT IMAGES

POST   /products/:id/images       — Upload imagem
DELETE /products/:id/images/:imageId — Remover imagem
PUT    /products/:id/images/reorder — Reordenar galeria

==========================================================

# CATEGORIES

GET    /categories          — Listar
GET    /categories/:id      — Detalhe
POST   /categories          — Criar
PUT    /categories/:id      — Atualizar
DELETE /categories/:id      — Desativar

==========================================================

# BRANDS

GET    /brands              — Listar
GET    /brands/:id          — Detalhe
POST   /brands              — Criar
PUT    /brands/:id          — Atualizar
DELETE /brands/:id          — Desativar

==========================================================

# CUSTOMERS

GET    /customers           — Listar (paginado, busca)
GET    /customers/:id       — Detalhe + pedidos
POST   /customers           — Criar
PUT    /customers/:id       — Atualizar
DELETE /customers/:id       — Desativar

==========================================================

# ORDERS

GET    /orders              — Listar (paginado, filtros)
GET    /orders/:id          — Detalhe
POST   /orders              — Criar pedido (manual ou site)
PUT    /orders/:id           — Atualizar
PATCH  /orders/:id/status   — Alterar status
DELETE /orders/:id           — Cancelar

Filtros: status, origin, channel, date, customer, search

Body criação manual:

{
  "customerId": "uuid",
  "origin": "LOCAL | ONLINE",
  "channel": "LOJA_FISICA | SITE | WHATSAPP | INSTAGRAM",
  "items": [{ "productId": "uuid", "quantity": 1 }],
  "deliveryAddress": { ... },
  "notes": "string"
}

Pedidos LOCAL entram como PAGO por padrão.

Pedidos ONLINE + SITE entram como AGUARDANDO_PAGAMENTO.

Resposta para EMPLOYEE: sem unitCostPrice, profit, margin.

Resposta para ADMIN: inclui dados financeiros do pedido.

==========================================================

# STOCK

GET    /stock                      — Estoque atual (paginado)
GET    /stock/low                  — Produtos com estoque baixo
GET    /stock/history              — Histórico de movimentações
POST   /stock/movements            — Registrar movimentação

Body movimentação:

{
  "productId": "uuid",
  "type": "ENTRADA | VENDA | TROCA | PERDA | DEVOLUCAO | AJUSTE",
  "quantity": 10,
  "reason": "string"
}

==========================================================

# PAYMENTS (ASAAS)

POST   /payments/checkout          — Criar cobrança Asaas (checkout site)
POST   /payments/webhook           — Webhook Asaas (sem auth, validar token)
GET    /payments/:orderId          — Status do pagamento

==========================================================

# DASHBOARD

GET    /dashboard                  — Métricas do dia

Resposta base (todos):

{
  "ordersToday": 0,
  "salesToday": 0,
  "revenueToday": 0,
  "lowStockProducts": [],
  "outOfStockProducts": [],
  "pendingSeparation": 0,
  "recentOrders": []
}

Campos adicionais (somente ADMIN):

{
  "profitToday": 0,
  "marginToday": 0
}

==========================================================

# SETTINGS

GET    /settings              — Configurações da loja
PUT    /settings              — Atualizar (somente ADMIN)

==========================================================

# LOJA PÚBLICA (sem autenticação)

GET    /store/products        — Listar produtos ativos
GET    /store/products/:slug  — Detalhe por slug
GET    /store/categories      — Categorias ativas
GET    /store/brands          — Marcas ativas
POST   /store/orders          — Criar pedido (checkout)
POST   /store/payments        — Iniciar pagamento Asaas

==========================================================

# SEGURANÇA

JWT + Refresh Token

Rate Limit

Helmet

CORS configurado

Validação de DTOs (class-validator)

Webhook Asaas: validar token/assinatura

Interceptor de campos financeiros por role

==========================================================

# CÓDIGOS DE RESPOSTA

200 — Sucesso
201 — Criado
400 — Dados inválidos
401 — Não autenticado
403 — Sem permissão (ex: EMPLOYEE acessando financeiro)
404 — Não encontrado
409 — Conflito (ex: estoque insuficiente)
500 — Erro interno
