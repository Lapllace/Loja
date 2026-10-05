# DATABASE

# ==========================================================
# GIL IMPORTS
# ESPECIFICAÇÃO DO BANCO DE DADOS
# ==========================================================

Versão: 2.1

Banco: PostgreSQL

ORM: Prisma

Schema completo: docs/PRISMA_SCHEMA.prisma

NÃO iniciar implementação do backend antes da aprovação definitiva do schema.

==========================================================

# REGRAS GERAIS

Todas as tabelas possuem:

id (UUID, chave primária)

created_at

updated_at

deleted_at (quando aplicável — soft delete)

Pedidos e movimentações de estoque NUNCA são apagados.

Nunca escrever SQL diretamente (usar Prisma).

==========================================================

# ENUMS

UserRole: ADMIN, EMPLOYEE

OrderOrigin: LOCAL, ONLINE

OrderChannel: LOJA_FISICA, SITE, WHATSAPP, INSTAGRAM

OrderStatus: CRIADO, AGUARDANDO_PAGAMENTO, PAGO, SEPARANDO,
             PRONTO_PARA_ENTREGA, ENTREGUE, CANCELADO

StockMovementType: ENTRADA, VENDA, TROCA, PERDA, DEVOLUCAO, AJUSTE

PaymentMethod: PIX, CREDIT_CARD, BOLETO

PaymentStatus: PENDING, CONFIRMED, FAILED, REFUNDED, EXPIRED

==========================================================

# ESTOQUE RESERVADO

Cada produto possui três conceitos de estoque:

| Conceito         | Persistido | Descrição                                      |
|------------------|------------|------------------------------------------------|
| stock            | Sim        | Quantidade física total                        |
| reserved_stock   | Sim        | Reservado por pedidos online pendentes         |
| available_stock  | Não        | Calculado: stock - reserved_stock              |

Fluxo pagamento online:

1. Pedido criado (AGUARDANDO_PAGAMENTO) → reserved_stock += quantidade
2. Webhook PagBank confirma pagamento → stock -= quantidade, reserved_stock -= quantidade
3. Pagamento expira ou cancela → reserved_stock -= quantidade (stock inalterado)

Regras (enforced no service layer):

- reserved_stock >= 0
- stock >= reserved_stock
- Nunca vender acima de available_stock

Pedidos presenciais (LOCAL, status PAGO) baixam stock diretamente, sem reserva.

==========================================================

# TABELAS

## users

Usuários do sistema (suporta múltiplos).

| Campo          | Tipo      | Descrição                        |
|----------------|-----------|----------------------------------|
| id             | UUID      | PK                               |
| name           | String    | Nome                             |
| email          | String    | Unique                           |
| password_hash  | String    | bcrypt                           |
| role           | UserRole  | ADMIN ou EMPLOYEE                |
| is_active      | Boolean   | Ativo/inativo                    |
| last_login     | DateTime? | Último login                     |
| created_at     | DateTime  |                                  |
| updated_at     | DateTime  |                                  |
| deleted_at     | DateTime? | Soft delete                      |

## refresh_tokens

Tokens de refresh para invalidação no logout.

| Campo       | Tipo     | Descrição              |
|-------------|----------|------------------------|
| id          | UUID     | PK                     |
| user_id     | UUID     | FK → users             |
| token_hash  | String   | Hash do refresh token  |
| expires_at  | DateTime | Expiração              |
| created_at  | DateTime |                        |

## customers

Clientes (dados mínimos, sem CRM).

| Campo       | Tipo      | Descrição           |
|-------------|-----------|---------------------|
| id          | UUID      | PK                  |
| name        | String    |                     |
| phone       | String    | Indexado            |
| email       | String?   |                     |
| cpf         | String?   |                     |
| street      | String?   | Endereço            |
| city        | String?   | Cidade              |
| district    | String?   | Bairro              |
| zip_code    | String?   | CEP                 |
| reference   | String?   | Referência          |
| created_at  | DateTime  |                     |
| updated_at  | DateTime  |                     |
| deleted_at  | DateTime? | Soft delete         |

## categories

| Campo       | Tipo      | Descrição           |
|-------------|-----------|---------------------|
| id          | UUID      | PK                  |
| name        | String    |                     |
| slug        | String    | Unique              |
| image       | String?   | Caminho em storage/ |
| sort_order  | Int       | Ordenação           |
| active      | Boolean   |                     |
| created_at  | DateTime  |                     |
| updated_at  | DateTime  |                     |
| deleted_at  | DateTime? | Soft delete         |

## brands

| Campo       | Tipo      | Descrição           |
|-------------|-----------|---------------------|
| id          | UUID      | PK                  |
| name        | String    |                     |
| slug        | String    | Unique              |
| active      | Boolean   |                     |
| created_at  | DateTime  |                     |
| updated_at  | DateTime  |                     |
| deleted_at  | DateTime? | Soft delete         |

## products

| Campo          | Tipo      | Descrição                              |
|----------------|-----------|----------------------------------------|
| id             | UUID      | PK                                     |
| sku            | String    | Unique                                 |
| barcode        | String?   | Unique, opcional                       |
| slug           | String    | Unique                                 |
| name           | String    |                                        |
| description    | String?   |                                        |
| price          | Decimal   | Preço de venda                         |
| sale_price     | Decimal?  | Preço promocional                      |
| cost_price     | Decimal   | Preço de compra (ADMIN only na API)  |
| stock          | Int       | Estoque físico total                   |
| reserved_stock | Int       | Reservado (pedidos pendentes)          |
| min_stock      | Int       | Alerta estoque baixo (sem default DB)  |
| category_id    | UUID      | FK → categories                        |
| brand_id       | UUID      | FK → brands                            |
| is_active      | Boolean   | Visível na loja                        |
| is_featured    | Boolean   | Destaque na home                       |
| created_at     | DateTime  |                                        |
| updated_at     | DateTime  |                                        |
| deleted_at     | DateTime? | Soft delete                            |

Campo calculado (não persistido): available_stock = stock - reserved_stock

min_stock: ao cadastrar produto, service copia settings.default_min_stock.
Cada produto pode ter min_stock próprio posteriormente.

## product_images

| Campo         | Tipo     | Descrição              |
|---------------|----------|------------------------|
| id            | UUID     | PK                     |
| product_id    | UUID     | FK → products          |
| path          | String   | Caminho em storage/    |
| display_order | Int      | Ordem da galeria       |
| is_cover      | Boolean  | Imagem principal       |
| created_at    | DateTime |                        |

## stock_movements

Histórico imutável de movimentações.

| Campo       | Tipo                | Descrição              |
|-------------|---------------------|------------------------|
| id          | UUID                | PK                     |
| type        | StockMovementType   |                        |
| product_id  | UUID                | FK → products          |
| quantity    | Int                 | Sempre positivo        |
| reason      | String?             | Motivo                 |
| user_id     | UUID                | FK → users             |
| order_id    | UUID?               | FK → orders (vendas)   |
| created_at  | DateTime            |                        |

A direção (entrada/saída) é determinada pelo type no service layer.

## orders

| Campo               | Tipo          | Descrição                    |
|---------------------|---------------|------------------------------|
| id                  | UUID          | PK                           |
| order_number        | Int           | Auto increment, unique       |
| customer_id         | UUID?         | FK → customers               |
| created_by_id       | UUID          | FK → users                   |
| origin              | OrderOrigin   | LOCAL ou ONLINE              |
| channel             | OrderChannel  | LOJA_FISICA, SITE, etc.      |
| status              | OrderStatus   |                              |
| subtotal            | Decimal       |                              |
| discount            | Decimal       | Default 0                    |
| total               | Decimal       |                              |
| notes               | String?       | Observações operacionais     |
| delivery_street     | String?       | Snapshot de entrega          |
| delivery_city       | String?       |                              |
| delivery_district   | String?       |                              |
| delivery_zip_code   | String?       |                              |
| delivery_reference  | String?       |                              |
| created_at          | DateTime      |                              |
| updated_at          | DateTime      |                              |

notes — visível para ADMIN e EMPLOYEE.
Ex: "Cliente busca na loja", "Entregar após 18h", "Motoboy já chamado".

Pedidos NÃO possuem deleted_at (nunca apagar).

## order_items

| Campo            | Tipo    | Descrição                              |
|------------------|---------|----------------------------------------|
| id               | UUID    | PK                                     |
| order_id         | UUID    | FK → orders                            |
| product_id       | UUID    | FK → products                          |
| product_name     | String  | Snapshot                               |
| sku              | String  | Snapshot                               |
| quantity         | Int     |                                        |
| unit_price       | Decimal | Preço no momento da venda              |
| unit_cost_price  | Decimal | Custo no momento (ADMIN only na API)   |
| total            | Decimal |                                        |

## payments

| Campo              | Tipo           | Descrição              |
|--------------------|----------------|------------------------|
| id                 | UUID           | PK                     |
| order_id           | UUID           | FK → orders            |
| pagbank_payment_id | String?        | Unique, ID PagBank     |
| pagbank_customer_id| String?        | ID cliente PagBank     |
| method             | PaymentMethod  | PIX, CREDIT_CARD, BOLETO|
| status             | PaymentStatus  |                        |
| amount             | Decimal        |                        |
| paid_at            | DateTime?      |                        |
| created_at         | DateTime       |                        |
| updated_at         | DateTime       |                        |

## settings

Armazenamento key/value.

| Campo       | Tipo     | Descrição              |
|-------------|----------|------------------------|
| id          | UUID     | PK                     |
| key         | String   | Unique                 |
| value       | String   | Texto ou JSON          |
| updated_at  | DateTime |                        |

Chaves obrigatórias (seed inicial):

| Chave              | Exemplo                | Descrição                        |
|--------------------|------------------------|----------------------------------|
| store_name         | Gil Imports            | Nome da loja                     |
| store_phone        | (11) 99999-9999        | Telefone                         |
| store_email        | contato@gilimports.com | Email                            |
| instagram          | @gilimports            | Instagram                        |
| whatsapp           | 5511999999999          | WhatsApp                         |
| address            | Rua X, 123             | Endereço da loja                 |
| default_min_stock  | 3                      | Estoque mínimo padrão (produtos) |
| currency           | BRL                    | Moeda                            |
| timezone           | America/Sao_Paulo      | Fuso horário                     |
| maintenance_mode   | false                  | Modo manutenção (loja virtual)   |

Chaves sensíveis (asaas_api_key, etc.) ficam no .env, não no banco.

==========================================================

# RELACIONAMENTOS

User 1:N Order (created_by)
User 1:N StockMovement
User 1:N RefreshToken

Customer 1:N Order

Category 1:N Product
Brand 1:N Product

Product 1:N ProductImage
Product 1:N OrderItem
Product 1:N StockMovement

Order 1:N OrderItem
Order 1:N Payment
Order 1:N StockMovement

==========================================================

# PROTEÇÃO DE DADOS FINANCEIROS

Campos restritos a ADMIN (filtrados no backend):

products.cost_price

order_items.unit_cost_price

Campos calculados (nunca persistidos):

available_stock = stock - reserved_stock

lucro = SUM((unit_price - unit_cost_price) × quantity)

margem = lucro / faturamento × 100

faturamento = SUM(total) dos pedidos PAGO/SEPARANDO/PRONTO_PARA_ENTREGA/ENTREGUE

==========================================================

# ÍNDICES PRINCIPAIS

products: sku, slug, barcode, category_id, brand_id, is_active, is_featured

orders: status, origin, channel, customer_id, created_at, order_number

customers: phone, email

stock_movements: product_id, order_id, created_at

payments: order_id, status, asaas_payment_id

==========================================================

# UPLOADS

Imagens referenciadas por path relativo:

storage/products/{uuid}.{ext}

storage/categories/{slug}.{ext}

storage/brands/{slug}.{ext}

storage/avatars/{userId}.{ext}

storage/temp/{uuid}.{ext}

==========================================================

# SEED INICIAL

2 usuários (ADMIN + EMPLOYEE)

Categorias base (Capinhas, Películas, Cabos, etc.)

Settings com todas as chaves obrigatórias (default_min_stock = 3)

==========================================================

# FORA DO ESCOPO

Nota Fiscal, CRM, Cupons, Cashback, Fidelidade, Marketplace,
Shopee, Mercado Livre, Correios, IA, Chat, Multiempresa,
Multiestoque, Materiais internos, Fluxo de caixa, Contabilidade.

==========================================================

# BACKUP

Diário: PostgreSQL + storage/

Configurar na fase de deploy Umbrel.

==========================================================

# SCHEMA PRISMA

O schema completo está em:

docs/PRISMA_SCHEMA.prisma

Após aprovação definitiva, será copiado para backend/prisma/schema.prisma.
