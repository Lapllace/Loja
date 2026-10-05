# CHANGELOG

# ==========================================================
# GIL IMPORTS
# HISTÓRICO DO PROJETO
# ==========================================================

## Versão 0.0.1

Início do projeto.

Estrutura criada.

Documentação inicial.

==========================================================

## Versão 0.1

Planejamento

- Estrutura de pastas
- Definição das tecnologias
- Regras do projeto
- Contexto da IA
- Banco de dados
- API
- Guia de Interface

==========================================================

## Versão 0.2 — Decisões Oficiais e Reescrita da Documentação

Data: 05/08/2026

Decisões definitivas aprovadas:

- Projeto redefinido como ERP leve (não e-commerce tradicional)
- Loja virtual como canal de venda integrado
- Usuários: roles ADMIN e EMPLOYEE (múltiplos usuários suportados)
- Permissões operacionais idênticas; dados financeiros exclusivos ADMIN
- Estoque único compartilhado (LOCAL + ONLINE)
- Pedidos com origin (LOCAL/ONLINE) e channel (LOJA_FISICA/SITE/WHATSAPP/INSTAGRAM)
- Status de pedidos padronizados em português
- Promoções apenas via price/sale_price (sem cupons/campanhas)
- Pagamento online via PagBank (PIX, cartão, boleto)
- Uploads locais em storage/ (sem S3)
- Desenvolvimento local sem Docker; Docker apenas no deploy Umbrel
- Eliminação de módulos: coupons, promotions, materials, finance

Documentos atualizados para v2.0:

- AI_CONTEXT.md
- PROJECT_RULES.md
- BUSINESS_RULES.md
- FEATURES.md
- SYSTEM_ARCHITECTURE.md
- API.md
- SECURITY.md
- DATABASE.md
- ROADMAP.md
- UI_GUIDE.md

Schema Prisma proposto:

- docs/PRISMA_SCHEMA.prisma (aguardando aprovação)

==========================================================

## Versão 0.2.1 — Revisão do Schema Prisma

Data: 05/08/2026

Decisões incorporadas ao schema (v2.1):

- Estoque reservado: reserved_stock + available_stock calculado
- default_min_stock em Settings (sem default fixo no produto)
- orders.notes confirmado (ADMIN e EMPLOYEE)
- product_images: display_order e is_cover
- products: is_active, is_featured, sku, barcode, slug confirmados
- Settings: chaves obrigatórias documentadas
- Escopo negativo oficialmente registrado

==========================================================

## Versões Futuras (planejadas)

0.3 — Backend core (após aprovação do schema)

0.4 — Painel operacional

0.5 — Loja virtual + PagBank

1.0 — Deploy Umbrel, produção

==========================================================

Toda alteração relevante deverá ser registrada neste documento.

Nunca remover versões anteriores.

Sempre acrescentar novas entradas ao final.
