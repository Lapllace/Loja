# SYSTEM ARCHITECTURE

# ==========================================================
# GIL IMPORTS
# ARQUITETURA DO SISTEMA
# ==========================================================

Versão: 2.0

Este documento define a arquitetura do sistema.

Toda implementação deverá seguir esta estrutura.

==========================================================

OBJETIVO

ERP leve para loja física com loja virtual integrada.

Simples de manter, rápido e com baixo consumo de recursos.

Hospedado em servidor Umbrel doméstico.

==========================================================

ARQUITETURA GERAL

Frontend (Next.js)
        ↓
REST API (/api)
        ↓
Backend (NestJS)
        ↓
Prisma ORM
        ↓
PostgreSQL

Imagens → storage/ (local)

Pagamentos online → PagBank (webhook)

==========================================================

TECNOLOGIAS

Frontend: Next.js, React, TypeScript, TailwindCSS, Lucide Icons

Backend: NestJS, TypeScript, Prisma ORM

Banco: PostgreSQL

Pagamentos: PagBank

Produção: Docker no Umbrel

Desenvolvimento: tudo local, sem Docker

==========================================================

ESTRUTURA DO PROJETO

Loja/

backend/

frontend/

docs/

branding/

storage/

scripts/

docker/ (apenas deploy)

==========================================================

BACKEND — ESTRUTURA NESTJS

backend/

src/

  main.ts

  app.module.ts

  prisma/

    prisma.service.ts

    prisma.module.ts

  modules/

    auth/

    users/

    products/

    categories/

    brands/

    customers/

    orders/

    stock/

    payments/

    dashboard/

    settings/

  common/

    guards/

    decorators/

    filters/

    interceptors/

    pipes/

  config/

Cada módulo contém:

  *.module.ts
  *.controller.ts
  *.service.ts
  dto/

Sem camada Repository separada.

Prisma Service é injetado diretamente nos services.

==========================================================

MÓDULOS

auth — JWT, login, refresh, guards por role

users — CRUD de usuários (ADMIN gerencia)

products — CRUD, imagens, campos financeiros filtrados por role

categories — CRUD

brands — CRUD

customers — CRUD mínimo

orders — CRUD, fluxo de status, origin + channel

stock — movimentações e histórico

payments — integração PagBank, webhook

dashboard — métricas operacionais (+ financeiras para ADMIN)

settings — configurações gerais da loja

Módulos eliminados: coupons, promotions, materials, finance.

==========================================================

CONTROLLERS

Receber requisições, validar DTOs, chamar services.

Nunca acessar banco diretamente.

==========================================================

SERVICES

Implementar regras de negócio.

Filtrar cost_price, lucro e margem para EMPLOYEE.

Nunca retornar HTML.

==========================================================

PRISMA

Todas as consultas via Prisma ORM.

Nunca escrever SQL diretamente, salvo quando necessário.

Schema em docs/PRISMA_SCHEMA.prisma.

==========================================================

FRONTEND — ESTRUTURA

frontend/

app/

  (store)/ — loja virtual pública

  (admin)/ — painel operacional

components/

  ui/ — componentes base reutilizáveis

  store/ — componentes da loja

  admin/ — componentes do painel

hooks/

lib/

services/ — comunicação com API

types/

styles/

Toda comunicação com API via services.

Nunca chamar fetch diretamente em componentes.

Estado: React Hooks. Zustand apenas se necessário.

==========================================================

UPLOADS

Imagens armazenadas localmente:

storage/products/

storage/categories/

storage/brands/

storage/avatars/

storage/temp/

Salvar apenas caminho relativo no banco.

Nunca salvar imagens no PostgreSQL.

Sem S3 ou armazenamento em nuvem.

==========================================================

AUTENTICAÇÃO

JWT + Refresh Token.

Roles: ADMIN, EMPLOYEE.

Guard global + decorator @Roles().

Interceptor ou service helper para filtrar campos financeiros.

==========================================================

PERMISSÕES

ADMIN e EMPLOYEE: mesmas permissões operacionais.

ADMIN exclusivo: cost_price, lucro, margem, faturamento detalhado.

Backend bloqueia dados financeiros para EMPLOYEE.

==========================================================

API

REST, JSON, em /api.

Consultar API.md para endpoints.

==========================================================

PAGAMENTOS (PAGBANK)

Fluxo:

1. Cliente finaliza checkout no site
2. Backend cria pedido (AGUARDANDO_PAGAMENTO)
3. Backend cria cobrança no PagBank
4. Cliente paga (PIX/cartão/boleto)
5. PagBank envia webhook
6. Backend confirma pagamento → PAGO
7. Estoque reduzido, movimentação VENDA registrada

==========================================================

PERFORMANCE

Paginação em listagens.

Lazy loading de imagens.

Compressão de imagens no upload.

Cache mínimo (sem Redis no MVP).

Otimizado para servidor doméstico.

==========================================================

DEPLOY (UMBREL)

Docker Compose com:

- backend
- frontend
- postgres
- reverse proxy (HTTPS)

Backup diário de banco + storage/.

Consultar templates/DEPLOY.md (a ser preenchido na fase de deploy).

==========================================================

OBJETIVO FINAL

Sistema próprio, simples, rápido e de fácil manutenção.

Pensado na realidade da Gil Imports, não em escala massiva.
