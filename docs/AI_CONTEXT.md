# AI_CONTEXT

# ==========================================================
# GIL IMPORTS
# CONTEXTO DO PROJETO
# ==========================================================

Versão: 2.0

Este documento é a fonte oficial de contexto do projeto.

Caso exista conflito com documentos anteriores, este documento prevalece.

==========================================================

EMPRESA

Nome: Gil Imports

Tipo: Loja física de produtos importados com loja virtual integrada.

Equipe: 2 funcionários (Administrador e Funcionária).

Não existe equipe de TI, financeiro ou logística.

==========================================================

NATUREZA DO SISTEMA

Este projeto NÃO é um e-commerce tradicional.

É um ERP leve para organizar uma pequena loja física que também vende online.

O site é apenas mais um canal de venda.

==========================================================

OBJETIVO PRINCIPAL

• Organizar o estoque
• Controlar vendas
• Controlar pedidos
• Facilitar o trabalho diário
• Aumentar as vendas

==========================================================

PRODUTOS

A loja vende produtos importados diversos.

Exemplos:

Capinhas, Películas, Cabos, Carregadores, Power Banks, Fones,
Smartwatch, Garrafas Stanley, Perfumes Árabes, Chaveiros,
Microfones, Caixas de Som, Gadgets e produtos importados diversos.

O cadastro deve ser totalmente genérico.

Nunca assumir que a loja vende apenas acessórios para celular.

==========================================================

CANAIS DE VENDA

Loja Física, WhatsApp, Instagram, Site.

Todos compartilham o mesmo estoque, produtos e clientes.

==========================================================

USUÁRIOS

Roles: ADMIN e EMPLOYEE.

A tabela suporta múltiplos usuários (hoje existem 2).

Permissões quase idênticas.

Somente ADMIN visualiza dados financeiros (cost_price, lucro, margem, faturamento).

O backend deve impedir acesso a esses dados para EMPLOYEE.

==========================================================

ESTOQUE

Existe apenas UM estoque compartilhado entre todos os canais.

Toda movimentação deve ser registrada.

Não haverá módulo de materiais internos.

==========================================================

PAGAMENTOS

Loja física: PIX, dinheiro e cartão (fora do sistema).

Loja virtual: integração PagBank (PIX, cartão, boleto).

==========================================================

PROMOÇÕES

Apenas price e sale_price no produto.

Sem cupons, campanhas, cashback ou fidelidade.

==========================================================

HOSPEDAGEM

Servidor Umbrel doméstico.

Priorizar simplicidade, desempenho e baixo consumo de recursos.

Docker apenas no deploy (não durante desenvolvimento).

==========================================================

IDENTIDADE VISUAL

Seguir obrigatoriamente /branding (logo, cores, referência Instagram).

Modernizar a identidade existente, nunca criar uma nova.

Nunca parecer clone da Shopee.

Shopee serve apenas como referência para organização de categorias.
