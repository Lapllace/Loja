# UI_GUIDE

# ==========================================================
# GIL IMPORTS
# GUIA DE INTERFACE
# ==========================================================

Versão: 2.0

==========================================================

OBJETIVO

Interface moderna, rápida, minimalista e profissional.

ERP leve + loja virtual integrada.

Mobile First (funcionária usa celular).

==========================================================

IDENTIDADE VISUAL

Seguir obrigatoriamente /branding:

- Logo da empresa
- Cores oficiais (COLORS.md)
- Estilo premium (BRAND_GUIDE.md)
- Referência do Instagram (UI_REFERENCES.md)

Cores principais:

- Preto #0B0B0B — fundos, navbar, rodapé, dashboard
- Dourado #C9A227 — botões, ícones, detalhes, links
- Branco #FFFFFF — texto, cards
- Cinza claro #F5F5F5 — fundos secundários
- Cinza médio #A0A0A0 — texto secundário
- Cinza escuro #303030 — bordas, divisores

Tipografia: Inter (fonte principal).

Ícones: Lucide Icons.

Nunca parecer template ou clone da Shopee.

Shopee serve apenas como referência para organização de categorias.

==========================================================

PAINEL OPERACIONAL

Prioridade: poucos cliques, operação rápida.

Layout:

- Sidebar colapsável (mobile: bottom nav ou drawer)
- Header com nome do usuário e logout
- Conteúdo principal limpo

Telas:

Dashboard, Produtos, Categorias, Marcas, Pedidos,
Clientes, Estoque, Configurações

Dashboard:

- Cards: pedidos hoje, vendas hoje, faturamento hoje
- Alertas: estoque baixo, sem estoque, aguardando separação
- Lista: últimos pedidos
- ADMIN: cards de lucro e margem

Pedidos:

- Lista com filtros (status, canal, origem, data)
- Badge colorido por status
- Alterar status com 1 toque
- Botão "+ Novo Pedido" sempre visível

Produtos:

- Listagem com busca rápida
- Cadastro em formulário simples
- Edição de estoque via movimentação (não inline)

Dados financeiros (cost_price, lucro, margem):

- Visíveis apenas para ADMIN
- Campos simplesmente ausentes para EMPLOYEE

==========================================================

LOJA VIRTUAL

Home:

- Banner principal
- Categorias (grid horizontal scroll mobile)
- Produtos em destaque
- Promoções (produtos com sale_price)
- Rodapé

Menu:

- Logo
- Busca
- Categorias
- Carrinho

Produto:

- Galeria
- Nome, preço, preço promocional
- Indicador de estoque
- Descrição
- Botão "Adicionar ao Carrinho"
- Produtos relacionados

Checkout:

- Dados do cliente
- Endereço de entrega
- Tipo de entrega (retirada / local)
- Pagamento via Asaas
- Confirmação

Meta: finalizar compra em menos de 2 minutos.

==========================================================

RESPONSIVIDADE

Mobile First → Tablet → Desktop

Painel admin deve funcionar perfeitamente no celular.

==========================================================

PERFORMANCE

Lazy loading de imagens.

Otimização de imagens no upload.

Code splitting.

Poucas animações (rápidas e suaves).

==========================================================

UX

Estados obrigatórios:

- Loading (skeleton ou spinner)
- Erro (mensagem clara + retry)
- Sucesso (toast breve)
- Vazio (ilustração + ação)

Toasts para feedback de ações (salvar, status alterado).

Confirmação antes de cancelar pedido.

==========================================================

OBJETIVO FINAL

Profissionalismo, qualidade e facilidade de uso.

Modernizar a identidade existente, nunca reinventar.
