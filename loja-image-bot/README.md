# Loja Image Bot

Bot de descoberta, seleção e coleta de imagens de produtos para a Loja.

## Objetivo

Receber a identidade exata de um produto, gerar buscas individuais, consultar um provedor de busca de imagens, eliminar duplicatas óbvias, ranquear candidatos e permitir que apenas imagens selecionadas sejam baixadas e organizadas por produto.

O bot **não raspa diretamente Google, Mercado Livre ou Shopee**. O primeiro provider implementado usa a API do SerpApi para consultar resultados do Google Images. A resposta do provider preserva título, origem, URL da imagem e thumbnail para auditoria.

## Fluxo

1. Produto informa nome, marca/modelo e atributos.
2. `query-builder` gera buscas exatas e buscas direcionadas por domínio.
3. Provider consulta Google Images via SerpApi.
4. Candidatos são normalizados, deduplicados e ranqueados.
5. A interface mostra candidatos para revisão humana.
6. O desenvolvedor seleciona até 5 imagens.
7. O backend baixa somente as URLs aprovadas.
8. Os arquivos são salvos em `storage/product-images/<slug>/`.
9. Um `manifest.json` registra origem, página, consulta e data de coleta.

## Regras de segurança

- A chave SerpApi fica somente no backend.
- O download é protegido contra SSRF básico (localhost, loopback, redes privadas/link-local e hosts sem HTTP(S)).
- Tamanho máximo de download por imagem: 12 MB.
- Somente JPEG/PNG/WebP/GIF são aceitos.
- Imagens não são baixadas automaticamente apenas por aparecerem nos resultados.
- A origem e a página de origem ficam registradas no manifesto.
- A autorização de desenvolvedor é feita no backend, nunca somente pela UI.

## Provider atual

Defina `SERPAPI_KEY` no backend. O provider usa `engine=google_images`, `gl=br` e `hl=pt-br`.

A arquitetura separa provider de coleta para que outro fornecedor possa ser adicionado futuramente sem reescrever o restante.

## Integração com a Loja

Veja:

- `integration/nest/` para NestJS.
- `integration/frontend/` para o painel de desenvolvedor.
- `scripts/grant-developer.mjs` para marcar uma conta como desenvolvedor depois que o campo `isDeveloper` existir no Prisma.

## Observação sobre direitos de uso

O bot registra a origem para facilitar revisão. Encontrar uma imagem em uma busca não significa automaticamente que a Loja tenha licença para reutilizá-la comercialmente. A aprovação final de uso deve ser feita de acordo com a licença/permissão aplicável ao material.
