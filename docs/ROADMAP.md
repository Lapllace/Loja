# ROADMAP

# ==========================================================
# GIL IMPORTS
# ROADMAP DO PROJETO
# ==========================================================

Versão: 2.0

Versão Atual: 0.1 (documentação alinhada)

Meta: v1.0 em produção no Umbrel até fim de Agosto/2026

==========================================================

FASE 0 — DOCUMENTAÇÃO E BANCO [EM ANDAMENTO]

[X] Decisões oficiais consolidadas
[X] Documentação atualizada (/docs)
[X] Schema Prisma proposto (docs/PRISMA_SCHEMA.prisma)
[ ] Schema Prisma aprovado
[ ] Assets de branding (logo, referência Instagram)

==========================================================

FASE 1 — INFRAESTRUTURA LOCAL

[ ] Projeto NestJS (backend)
[ ] Projeto Next.js (frontend)
[ ] PostgreSQL local
[ ] Prisma configurado e migrado
[ ] .env.example
[ ] Seed inicial (usuários, categorias)

Desenvolvimento SEM Docker.

==========================================================

FASE 2 — BACKEND CORE

[ ] Auth (JWT + refresh + roles)
[ ] Users (CRUD, somente ADMIN)
[ ] Categories (CRUD)
[ ] Brands (CRUD)
[ ] Products (CRUD + imagens + filtro financeiro)
[ ] Stock (movimentações + histórico)
[ ] Customers (CRUD mínimo)

==========================================================

FASE 3 — PAINEL OPERACIONAL

[ ] Layout admin (identidade /branding)
[ ] Dashboard
[ ] Produtos (cadastro rápido)
[ ] Pedidos (criar manual, alterar status)
[ ] Clientes
[ ] Estoque
[ ] Categorias e Marcas

Prioridade: operação da loja física antes da loja virtual.

==========================================================

FASE 4 — PEDIDOS E PAGAMENTOS

[ ] Orders (fluxo completo, origin + channel)
[ ] Payments (integração PagBank)
[ ] Webhook PagBank
[ ] Baixa automática de estoque

==========================================================

FASE 5 — LOJA VIRTUAL

[ ] Home (banner, categorias, destaques)
[ ] Listagem e busca
[ ] Página do produto
[ ] Carrinho (localStorage)
[ ] Checkout
[ ] Pagamento PagBank (PIX, cartão, boleto)
[ ] Confirmação

==========================================================

FASE 6 — FINALIZAÇÃO

[ ] Dashboard financeiro (ADMIN)
[ ] Relatórios básicos
[ ] Ajustes de UX
[ ] Testes manuais dos fluxos críticos

==========================================================

FASE 7 — DEPLOY UMBREL

[ ] Docker Compose (backend + frontend + postgres)
[ ] HTTPS
[ ] Backup automatizado
[ ] v1.0 em produção

==========================================================

FORA DO ESCOPO DA V1

Cupons, campanhas, fidelidade, CRM, financeiro completo,
materiais internos, import/export, integrações externas,
app mobile, dark mode, Docker no desenvolvimento.

==========================================================

FORMA DE TRABALHO

Uma funcionalidade por vez.

Aguardar aprovação entre cada etapa.

Nunca implementar extras por iniciativa própria.
