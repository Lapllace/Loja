# PROJECT_RULES

# ==========================================================
# GIL IMPORTS
# REGRAS GERAIS DO PROJETO
# ==========================================================

Versão: 2.0

Última atualização: Agosto/2026

Este documento define todas as regras de desenvolvimento do projeto.

Caso exista conflito entre decisões da IA e este documento,
este documento terá prioridade.

==========================================================

# OBJETIVO

Desenvolver um ERP leve para a Gil Imports.

Loja física com loja virtual integrada.

O projeto deve ser:

- Simples
- Rápido
- Seguro
- Fácil de manter
- Leve (baixo consumo de memória e CPU)
- Pensado para servidor Umbrel doméstico

==========================================================

# FILOSOFIA

Sempre escolher:

Simplicidade > Complexidade

Legibilidade > Código inteligente

Performance > Efeitos visuais

Operação diária > Quantidade de funcionalidades

Organização > Velocidade

==========================================================

# TECNOLOGIAS

Frontend

- Next.js
- React
- TypeScript
- TailwindCSS
- Lucide Icons

Backend

- NestJS
- TypeScript
- Prisma ORM

Banco

- PostgreSQL

Hospedagem

- Umbrel (produção)
- Docker apenas no deploy

Desenvolvimento local

- Frontend local
- Backend local
- PostgreSQL local
- Sem Docker durante desenvolvimento

Pagamentos online

- Asaas (PIX, cartão, boleto)

==========================================================

# PADRÕES DE CÓDIGO

Nunca utilizar any.

Sempre utilizar TypeScript.

Evitar funções acima de 50 linhas.

Evitar arquivos acima de 300 linhas.

Componentes devem possuir responsabilidade única.

Sempre reutilizar código.

Nunca duplicar lógica.

==========================================================

# NOMENCLATURA

camelCase — variáveis e funções

PascalCase — componentes e classes

kebab-case — arquivos

snake_case — somente no banco de dados (via Prisma @@map)

Enums — SCREAMING_SNAKE_CASE

==========================================================

# FRONTEND

Mobile First.

Componentes reutilizáveis.

Responsivo.

Performance.

Toda comunicação com API via services (nunca fetch direto em componentes).

Seguir identidade visual em /branding.

==========================================================

# BACKEND

Arquitetura em módulos NestJS padrão.

Cada módulo contém: Controller, Service, DTO.

Prisma Service injetado nos services (sem camada Repository separada).

Nunca acessar banco diretamente pelo Controller.

Dados financeiros (cost_price, lucro, margem) NUNCA retornados para EMPLOYEE.

==========================================================

# BANCO

Toda tabela possuirá:

id (UUID)

created_at

updated_at

deleted_at (quando necessário)

Soft Delete para registros importantes.

Nunca apagar pedidos.

Consultar DATABASE.md e docs/PRISMA_SCHEMA.prisma antes de implementar.

==========================================================

# SEGURANÇA

Hash de senhas (bcrypt).

Validação de DTOs.

JWT + Refresh Token.

Proteção contra SQL Injection (Prisma).

Helmet e CORS configurados.

Rate Limit básico.

==========================================================

# FORMA DE TRABALHO

Antes de implementar qualquer funcionalidade:

1. Explicar o que será feito
2. Listar arquivos que serão alterados
3. Explicar a arquitetura escolhida
4. Implementar apenas UMA funcionalidade por vez
5. Aguardar aprovação antes de continuar

Nunca implementar funcionalidades extras por iniciativa própria.

Nunca alterar arquitetura por iniciativa própria.

==========================================================

# IA

Sempre consultar antes de implementar:

AI_CONTEXT.md

DATABASE.md

PRISMA_SCHEMA.prisma

API.md

BUSINESS_RULES.md

==========================================================

# OBJETIVO FINAL

Sistema extremamente simples, organizado, rápido e confiável.

Facilitar o dia a dia da Gil Imports.
