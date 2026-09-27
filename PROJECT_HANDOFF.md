# PROJECT HANDOFF — Loja

## 1. Visão geral do projeto

A Loja é um e-commerce da Gil Imports para venda de produtos importados, principalmente acessórios para celular, eletrônicos, smartwatches, caixas de som, garrafas térmicas e perfumes árabes.

O sistema possui uma vitrine pública, catálogo com filtros, página de produto, carrinho autenticado, checkout com endereço e PIX, área do cliente e painel administrativo. O backend concentra autenticação, regras de estoque, pedidos, pagamentos, entregas, usuários e armazenamento de imagens.

O fluxo comercial realmente implementado é: cliente consulta produtos ativos, autentica-se, adiciona itens ao carrinho, cadastra ou escolhe um endereço, cria um pedido online, tem o estoque decrementado em transação e inicia pagamento PIX pelo PagBank.

Há também ferramentas administrativas para produtos, categorias, marcas, usuários, pedidos, pagamentos, entregas e busca/importação de imagens por OWNER.

## 2. Stack tecnológica

- **Frontend:** Next.js 16.3.4, React 19, TypeScript, App Router.
- **Estilização:** Tailwind CSS 4 nativo, tokens em `frontend/src/app/globals.css`.
- **Backend:** NestJS 11, TypeScript, Express.
- **Banco:** PostgreSQL.
- **ORM:** Prisma 6.
- **Autenticação:** JWT com Passport, token mantido no frontend em `localStorage` ou `sessionStorage` conforme a opção de login.
- **Autorização:** `JwtAuthGuard`, `RolesGuard` e decorator `@Roles`.
- **Pagamentos:** PagBank para checkout PIX e webhook.
- **Entrega:** integração 99minutos implementada; Uber Direct possui estrutura e validação de webhook, mas os fluxos de cotação/criação/status ainda estão desabilitados.
- **Busca de imagens:** SerpApi Google Images e Google Autocomplete.
- **CEP:** ViaCEP consumido pelo frontend através de helper compartilhado.
- **Imagens:** Multer para upload multipart, diretório local `backend/uploads`, URLs públicas `/uploads/<arquivo>`; imagens remotas são baixadas pelo backend.
- **Deploy pretendido:** operação doméstica em Umbrel, com PostgreSQL persistente, backend e frontend separados.

## 3. Estrutura do projeto

```text
Loja/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── common/                 # guards e decorators de roles
│       ├── config/                 # ConfigModule e configuração
│       ├── database/               # PrismaModule/PrismaService
│       └── modules/
│           ├── auth/
│           ├── users/
│           ├── categories/
│           ├── brands/
│           ├── products/
│           ├── carts/
│           ├── orders/
│           ├── coupons/
│           ├── reviews/
│           ├── uploads/
│           ├── payments/
│           ├── addresses/
│           ├── delivery/
│           └── image-search/
├── frontend/
│   └── src/
│       ├── app/                    # rotas Next.js
│       ├── components/             # UI, layout, carrinho, admin e produtos
│       ├── hooks/
│       ├── lib/                    # API client, auth, CEP, tipos e utilitários
│       └── providers/              # carrinho e UI do carrinho
├── branding/
├── docs/
├── scripts/
├── templates/
└── PROJECT_HANDOFF.md
```

Arquivos gerados ou temporários, como `node_modules`, `.next`, `dist`, `uploads` e diagnósticos locais, não fazem parte deste handoff.

## 4. Estado atual do Backend

### Auth

**Finalidade:** registrar, autenticar e consultar o usuário atual.

**Endpoints reais:**

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me` com JWT

**Implementado e funcionando:**

- Validação de credenciais.
- Bloqueio de usuários com status `BLOCKED`.
- Geração de JWT com `sub`, `email` e `role`.
- Consulta autenticada do usuário atual.
- Registro cria o usuário e já retorna login.
- Password hash com PBKDF2-SHA256 no `UsersService`.
- Respostas públicas não incluem `passwordHash`.

**Precisa de revisão/testes:**

- O `AuthService` injeta `ConfigService` e `UsersService`, mas a configuração de expiração/segredo deve ser auditada no ambiente de produção.
- O documento de segurança antigo menciona refresh token, mas não há fluxo de refresh token implementado no código atual.
- Não há rate limiting ou proteção de força bruta visível no módulo atual.

### Users

**Finalidade:** administração de usuários, roles e status.

**Endpoints reais:**

- `POST /api/users` — ADMIN; somente OWNER pode criar usuário com role diferente de CUSTOMER.
- `GET /api/users` — ADMIN e OWNER pela hierarquia do `RolesGuard`.
- `GET /api/users/:id` — usuário pode consultar a si mesmo; ADMIN não pode consultar OWNER.
- `PATCH /api/users/:id` — usuário atualiza dados próprios; ADMIN não altera OWNER; OWNER pode atualizar dados normais.
- `PATCH /api/users/:id/role-status` — ADMIN/OWNER; ADMIN só atribui CUSTOMER e não altera OWNER.
- `DELETE /api/users/:id` — ADMIN exclui CUSTOMER; OWNER pode excluir qualquer usuário.

**Implementado:**

- Regras de hierarquia e proteção de OWNER no controller.
- CRUD básico e atualização de role/status.
- Interface administrativa `/admin/usuarios` com busca, alteração de status, alteração de role para OWNER e confirmação de exclusão.

**Problemas/observações:**

- O frontend usa proteção client-side para esconder páginas, mas a autoridade real é o backend.
- A regra de hierarquia do `RolesGuard` é por nível: declarar `@Roles(ADMIN)` permite ADMIN e OWNER. Isso é intencional em vários endpoints, mas deve ser revisado quando a permissão precisar ser exatamente OWNER.

### Categories

**Finalidade:** catálogo hierárquico de categorias.

**Endpoints reais:**

- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/categories/slug/:slug`
- `POST /api/categories` — ADMIN/OWNER pela hierarquia.
- `PATCH /api/categories/:id` — ADMIN/OWNER pela hierarquia.
- `DELETE /api/categories/:id` — ADMIN/OWNER pela hierarquia.

**Implementado:**

- CRUD backend.
- Categoria pai/filhos no schema.
- Filtro de produtos por categoria.
- Administração em `/admin/categorias`.
- Uso na vitrine e em `/loja/categorias/[slug]`.

**Precisa de revisão:**

- As validações específicas de slug, árvore e exclusão com filhos devem ser revisadas nos services/DTOs.

### Brands

**Finalidade:** marcas associadas a produtos.

**Endpoints reais:**

- `GET /api/brands`
- `GET /api/brands/:id`
- `POST /api/brands` — ADMIN/OWNER pela hierarquia.
- `PATCH /api/brands/:id` — ADMIN/OWNER pela hierarquia.
- `DELETE /api/brands/:id` — ADMIN/OWNER pela hierarquia.

**Implementado:**

- CRUD backend.
- Marca em produto por `brandId`.
- Administração em `/admin/marcas` com criação, edição, ativação e exclusão.
- Exclusão bloqueada pelo backend quando há produtos vinculados.

**Observações:**

- Os formulários de produto usam seletor de marcas existentes, evitando enviar nome textual como `brandId`.

### Products

**Finalidade:** catálogo, estoque, preço e imagens principais.

**Endpoints reais:**

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/slug/:slug`
- `POST /api/products` — ADMIN/OWNER pela hierarquia; multipart ou JSON.
- `PATCH /api/products/:id` — ADMIN/OWNER pela hierarquia; multipart ou JSON.
- `DELETE /api/products/:id` — ADMIN/OWNER pela hierarquia.
- `POST /api/products/upload-url` — ADMIN/OWNER; baixa uma imagem por URL.

**Implementado:**

- Cadastro e edição de SKU, nome, slug, descrição, preço, custo, estoque, categoria, marca e flags de ativo/destaque.
- Consulta pública com filtros por categoria, marca, busca, preço, ativo, destaque, estoque e ordenação.
- Upload multipart com campo principal `image` e adicionais `images`.
- Limite atual do controller: uma imagem em `image` e até cinco no campo `images`; o frontend seleciona até cinco arquivos e envia a primeira como principal.
- Exclusão protegida pelo histórico de pedidos/carrinho/reviews/wishlist/estoque; o painel oferece descontinuação via `active=false`.
- Edição em `/admin/produtos/[id]/editar`.

**Precisa de revisão:**

- O backend aceita até cinco arquivos adicionais além do campo principal, enquanto a UI limita a seleção total a cinco. O contrato permite mais do que a UI utiliza.
- `UpdateProductDto` e a semântica de campos ausentes devem ser revisados para garantir que edição não sobrescreva dados não enviados.

### Carts

**Finalidade:** carrinho autenticado por usuário.

**Endpoints reais:**

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`

**Implementado:**

- Carrinho associado ao usuário pelo JWT.
- Quantidade validada contra estoque.
- Backend rejeita campos controlados pelo servidor, como `userId`, `cartId`, `price` e `product`.
- Frontend possui página, drawer, contador no Header, atualização de quantidade, remoção e limpeza.
- Estado local é usado como cache visual, com backend como autoridade.

**Problemas/observações:**

- A mensagem de sessão expirada foi restringida a 401; 403 possui mensagem própria.
- A criação do pedido limpa os itens do carrinho dentro da transação.

### Orders

**Finalidade:** criação online, consulta e atualização operacional de pedidos.

**Endpoints reais:**

- `POST /api/orders` — CUSTOMER.
- `GET /api/orders` — CUSTOMER consulta próprios; ADMIN/OWNER consultam todos.
- `GET /api/orders/:id` — acesso conforme role e propriedade.
- `PATCH /api/orders/:id` — ADMIN/OWNER atualizam status.
- `DELETE /api/orders/:id` — explicitamente bloqueado; pedidos são históricos.

**Implementado:**

- Criação a partir do carrinho e endereço do usuário.
- Validação de produto ativo, estoque e `costPrice`.
- Cálculo de subtotal/total no backend.
- Decremento de estoque com condição `stock >= quantity` dentro da transação.
- Criação de `OrderItem` com snapshot de nome, SKU, preço e custo.
- Registro de `StockMovement` do tipo SALE.
- Limpeza do carrinho na mesma transação.
- Frontend de cliente em `/pedidos` com status e tentativa de pagamento PIX pendente.
- Administração em `/admin/pedidos` com filtros e atualização de status aceitos.

**Problemas/observações:**

- O frete atual no checkout é zero; não há cálculo de entrega integrado ao fluxo principal de criação do pedido.
- Cupons aparecem no schema, mas não estão integrados à criação do pedido.
- Os status de cancelamento/reembolso existem no enum, porém o painel documenta que nem todas as transições estão disponíveis.

### Coupons

**Estado: parcial/incompleto.**

**Endpoints declarados:**

- `POST /api/coupons`
- `GET /api/coupons`
- `GET /api/coupons/:id`
- `PATCH /api/coupons/:id`
- `DELETE /api/coupons/:id`

**Problema confirmado:**

- `CouponsController` chama métodos sem encaminhar os parâmetros recebidos e o `CouponsService` atual é um esqueleto. Não há CRUD funcional confiável nem integração com checkout/pedidos.
- Não há página frontend administrativa de cupons.
- O model `Coupon` existe e se relaciona com `Order`, mas não é aplicado no fluxo de criação de pedido.

### Reviews

**Estado: parcial/incompleto.**

**Endpoints declarados:**

- `POST /api/reviews`
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

**Problema confirmado:**

- `ReviewsController` também chama métodos sem repassar DTOs/IDs corretamente, e o service atual é um esqueleto.
- Não há fluxo de avaliações na PDP ou na área do cliente.
- O model possui `approved`, mas não há workflow funcional de moderação verificado.

### Uploads

**Finalidade:** armazenar imagens locais, remotas e imagens de produto.

**Endpoints reais:**

- `POST /api/products/upload-url` — ADMIN/OWNER.
- `GET /api/products/:productId/images` — público.
- `POST /api/products/:productId/images` — ADMIN/OWNER.
- `PATCH /api/products/:productId/images/:imageId` — ADMIN/OWNER.
- `DELETE /api/products/:productId/images/:imageId` — ADMIN/OWNER.
- Arquivos físicos são servidos em `/uploads/<filename>` sem prefixo `/api`.

**Implementado:**

- Multer com `image` e `images`.
- MIME aceito: JPEG, PNG, WebP, GIF e AVIF.
- Limite de upload local: 5 MB.
- Nomes gerados para evitar path traversal/colisão simples.
- Upload por URL com limite, MIME declarado e armazenamento local.
- Edição de imagens existentes, remoção e reorganização de posição no frontend.

**Riscos/observações:**

- `storeImageFromUrl` valida MIME declarado e tamanho, mas não usa a mesma validação de magic bytes/SSRF robusta do downloader do ImageSearch; isso merece revisão antes de exposição ampla.
- Diretório de uploads é público e precisa de política de retenção, backup e proteção operacional.
- O arquivo baixado por URL é gravado antes de existir uma verificação de assinatura de conteúdo equivalente à do ImageSearch.

### Payments

**Finalidade:** pagamento online e atualização por webhook.

**Endpoints reais:**

- `POST /api/payments` — CUSTOMER; atualmente somente PIX.
- `POST /api/payments/checkout` — CUSTOMER; chama o mesmo fluxo de criação.
- `GET /api/payments` — cliente vê próprios; ADMIN/OWNER veem todos.
- `GET /api/payments/:id`.
- `PATCH /api/payments/:id` — ADMIN/OWNER.
- `DELETE /api/payments/:id` — bloqueado por serem registros históricos.
- `POST /api/payments/webhooks/pagbank` — público, validado por token/configuração do PagBank.

**Implementado:**

- Criação de pagamento PIX com status PENDING.
- Integração com `PagBankService` para criar checkout/QR Code/copia e cola.
- Idempotência básica por `orderId` para pagamento existente.
- Serialização de pagamento sem expor dados indevidos.
- Webhook interpreta status/referência/transação e atualiza registros.
- Frontend exibe QR Code, código copia e cola e expiração.

**Limitações:**

- Cartão, boleto e outros métodos são exibidos como indisponíveis no frontend.
- O checkout usa `POST /payments`; existe também `/payments/checkout`, mas o cliente atual utiliza o primeiro.
- A validação completa de assinatura/idempotência do webhook deve ser revisada em ambiente real.

### Addresses

**Finalidade:** endereços do cliente para entrega.

**Endpoints reais:**

- `GET /api/addresses`
- `GET /api/addresses/:id`
- `POST /api/addresses`
- `PATCH /api/addresses/:id`
- `PATCH /api/addresses/:id/default`
- `DELETE /api/addresses/:id`

Todos exigem JWT e são filtrados por `req.user.id`.

**Implementado:**

- CRUD e endereço padrão por tipo.
- Normalização de CEP e UF.
- Troca transacional do endereço padrão.
- Promoção de substituto ao remover o endereço padrão.
- ViaCEP no frontend da conta e do checkout através de `frontend/src/lib/cep.ts`.
- Checkout salva endereço novo, atualiza a lista e seleciona o registro criado.

**Precisa de revisão:**

- O frontend ainda possui formulários de endereço próprios em conta e checkout; a lógica de busca foi compartilhada, mas a UI não é um componente único.
- ViaCEP é uma integração client-side sem fallback local além da edição manual.

### Delivery

**Finalidade:** cotação, criação, autorização, acompanhamento e webhooks de entrega.

**Endpoints reais:**

- `POST /api/deliveries/quote` — CUSTOMER.
- `POST /api/deliveries` — CUSTOMER/ADMIN/OWNER.
- `GET /api/deliveries` — conforme role.
- `GET /api/deliveries/:id`.
- `PATCH /api/deliveries/:id` — ADMIN/OWNER.
- `DELETE /api/deliveries/:id` — ADMIN/OWNER.
- `GET /api/deliveries/pending-authorization` — ADMIN/OWNER.
- `POST /api/deliveries/:id/authorize` — ADMIN/OWNER.
- `POST /api/deliveries/webhooks/uber`.
- `POST /api/deliveries/webhooks/ninenine`.

**Implementado:**

- Modelagem de métodos PICKUP, UBER, NINENINE e MANUAL.
- Máquina de transições de status em `DeliveryService`.
- Fluxo de autorização administrativa após cotação/pagamento.
- Integração 99minutos com OAuth, cotação, criação, acompanhamento e webhook normalizado.
- Página `/admin/entregas` para pendências e listagem.

**Parcial:**

- Uber Direct possui configuração, validação HMAC de webhook e interfaces, mas cotação/criação/status lançam `ServiceUnavailableException` por falta do contrato/credenciais oficiais.
- O checkout atual não chama cotação de entrega e define frete como zero.
- Configuração de endereço da loja é necessária para operações de pickup/entrega.

### ImageSearch

**Finalidade:** pesquisar imagens externas para uso em produtos.

**Endpoints reais:**

- `GET /api/developer/image-search/suggestions` — OWNER.
- `POST /api/developer/image-search/search` — OWNER.
- `POST /api/developer/image-search/download` — OWNER.
- `POST /api/developer/image-search/import` — OWNER.

**Implementado:**

- Busca Google Images via SerpApi.
- Provider diferencia `original`, `image`, `thumbnail` e página de origem; prioriza a imagem original.
- Ranking por nome, marca, modelo, volume, variante, domínio e dimensões.
- Deduplicação de candidatos.
- Download individual com redirects limitados, SSRF/DNS safety, MIME, tamanho, HTML e magic bytes.
- JPEG, PNG, WebP, GIF e AVIF aceitos quando comprovados pelo conteúdo.
- Fallback para thumbnail quando a URL original retorna HTML, mantendo a mesma validação.
- Falhas individuais não abortam imagens válidas.
- Manifest local com hash SHA-256, arquivo, origem, query, tamanho e content-type.
- Importação associada ao produto existente.
- Frontend OWNER em `/admin/desenvolvedor/imagens` e integração nos formulários de produto.

**Precisa de revisão/testes:**

- O fallback de thumbnail foi implementado, mas deve ser coberto por testes unitários específicos do downloader/collector.
- A importação grava arquivos e registros em etapas separadas; uma falha após o arquivo ser salvo pode deixar arquivo órfão.
- O controller aceita `download` e `import` com semântica semelhante; revisar se ambos são necessários.

### StoreSettings

**Estado: schema e consumo parcial; módulo administrativo ausente.**

- O model `StoreSettings` existe no Prisma com nome, contatos, endereço, latitude e longitude.
- `DeliveryService` lê o primeiro registro para endereço de retirada/origem.
- Não existe `StoreSettingsModule` importado no `AppModule`.
- Não existe controller/API administrativa ou página frontend confirmada para configurar a loja.
- Para produção, o registro precisa ser criado/configurado por migração/seed/manual antes de usar entregas que dependem dele.

## 5. Estado atual do Frontend

### Vitrine

- Rota `/` redireciona para `/loja`.
- `/loja` chama `api.getActiveCategories` e `api.getProducts` em paralelo.
- Hero, barra de anúncio, categorias, seção de benefícios e seleção de produtos estão implementados.
- Header, Footer, ThemeToggle e CartDrawer estão integrados ao layout da vitrine.
- O tema escuro altera variáveis CSS e persiste a preferência no navegador.

### Catálogo

- `/loja/produtos` usa `useProducts`, filtros por URL e filtros de cliente.
- Há busca textual, categoria, preço, estoque, destaque e ordenação.
- `ProductGrid` é responsivo.
- `ProductCard` mostra imagem segura, preço, status, selo e botão de adicionar ao carrinho.
- A busca textual é enviada ao endpoint de produtos.

### Produto

- `/loja/produtos/[slug]` carrega produto por slug.
- Metadata e canonical são gerados.
- Galeria possui imagem principal e miniaturas.
- Descrição e especificações usam `details/summary`.
- `ProductActions` permite adicionar conforme estoque.
- Reviews/wishlist não estão integrados à página.

### Categorias

- `/loja/categorias/[slug]` carrega categoria e produtos associados.
- Links de categorias populares existem no Footer.
- A árvore de categorias existe no schema, mas a UI pública não evidencia navegação hierárquica completa.

### Carrinho

- `/loja/carrinho` e `CartDrawer` usam `CartProvider`.
- Permite alterar quantidade, remover, limpar e ir ao checkout.
- Usuário não autenticado recebe convite para login.
- O cliente distingue erros de carregamento, mutação, 401 e 403.

### Checkout

- `/checkout` exige autenticação e carrinho.
- Lista endereços existentes.
- Permite preencher/salvar endereço novo, usar ViaCEP e selecionar o endereço criado.
- Apenas PIX é habilitado.
- Cria pedido e então pagamento PIX.
- Exibe QR Code, copia e cola e expiração.
- Frete está fixado em zero; entrega não está integrada ao checkout atual.
- Mensagem de sessão expirada é usada para 401; 400, 403, 404 e demais erros têm tratamento separado.

### Login/cadastro

- `/login` autentica e possui `Lembrar de mim`.
- Marcado salva sessão em `localStorage`; desmarcado usa `sessionStorage`.
- `/cadastro` registra nome, email, senha, telefone e CPF.
- Valida senha mínima e confirmação no cliente.
- Não há recuperação de senha visível.
- O texto/documentação antiga menciona refresh token, mas o frontend atual não possui fluxo de refresh token.

### Pedidos

- `/pedidos` lista pedidos do usuário.
- Exibe badges por status.
- Para pedidos pendentes, tenta iniciar/consultar pagamento PIX.
- Não há tela pública detalhada de pedido separada.

### Conta

- `/conta` carrega perfil e endereços.
- Permite remover endereço e adicionar novo endereço.
- ViaCEP preenche rua, bairro, cidade e UF.
- Logout limpa as storages da sessão.
- Há links para pedidos, carrinho e loja.

### Admin

- Layout `/admin` usa `AdminShell`, que faz proteção client-side e navegação.
- `/admin` mostra contagens reais de produtos, categorias, marcas, pedidos, pagamentos, entregas e usuários para OWNER.
- `/admin/produtos` lista, filtra, visualiza, edita, exclui ou descontinua produtos.
- `/admin/produtos/novo` cria produtos com upload local, URL, colagem e busca de imagens para OWNER.
- `/admin/produtos/[id]/editar` edita campos e imagens existentes.
- `/admin/categorias` administra categorias.
- `/admin/marcas` administra marcas.
- `/admin/pedidos` lista, filtra e atualiza status dentro das transições aceitas.
- `/admin/pagamentos` lista e administra registros de pagamento.
- `/admin/entregas` lista entregas e autoriza as pendentes.
- `/admin/usuarios` administra usuários, status, roles conforme permissão e exclusões.
- Não há página administrativa de cupons, reviews, configurações da loja, estoque dedicado ou dashboard financeiro detalhado.

### Busca de imagens

- `/admin/desenvolvedor/imagens` é OWNER-only no backend.
- O diálogo busca candidatos, mostra thumbnail, permite seleção de até cinco e importa para produto existente.
- Os formulários de produto permitem selecionar imagens antes de o produto existir; a importação acontece após a criação do produto.
- O frontend mostra falhas individuais retornadas pelo backend.

## 6. Banco de dados

Schema real em `backend/prisma/schema.prisma`, PostgreSQL.

### Models principais

- `User`: credenciais, role, status, endereços, pedidos, carrinho, reviews, wishlist e movimentos de estoque.
- `Address`: endereço por usuário, tipo e flag de padrão.
- `Category`: nome, slug, árvore pai/filhos, imagem e ativo.
- `Brand`: nome, slug, descrição, logo, site e ativo.
- `Product`: SKU, nome, slug, descrição, preços, custo, estoque, dimensões, categoria, marca e imagens.
- `ProductImage`: URL, alt, posição e produto.
- `Cart`/`CartItem`: carrinho único por usuário e itens únicos por produto.
- `Order`: origem, status, valores, snapshot do endereço, cupom, itens, pagamento e entrega.
- `OrderItem`: snapshot do produto, preço, custo, quantidade e total.
- `Coupon`: código, tipo, valor, limites, validade e contagem de uso.
- `Payment`: um pagamento por pedido, método, origem, status, provider e transação.
- `Delivery`: um registro por pedido, método, provider, cotação, status, rastreio e entregador.
- `StoreSettings`: endereço e contatos da loja para origem/retirada.
- `Review`: avaliação por usuário/produto, aprovação e comentário.
- `Wishlist`: relação única usuário/produto.
- `StockMovement`: entradas, vendas, devoluções, ajustes e perdas, com autor opcional.

### Enums

- `UserRole`: `CUSTOMER`, `ADMIN`, `OWNER`.
- `UserStatus`: `ACTIVE`, `PENDING`, `BLOCKED`.
- `OrderOrigin`: `ONLINE`, `PHYSICAL`.
- `OrderStatus`: `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`.
- `PaymentSource`: `ONLINE`, `PHYSICAL`.
- `PaymentMethod`: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `BOLETO`, `CASH`.
- `PaymentStatus`: `PENDING`, `PAID`, `FAILED`, `REFUNDED`.
- `CouponType`: `PERCENTAGE`, `FIXED`, `FREE_SHIPPING`.
- `DeliveryMethod`: `PICKUP`, `UBER`, `NINENINE`, `MANUAL`.
- `DeliveryProvider`: `NONE`, `UBER`, `NINENINE`, `MANUAL`.
- `DeliveryStatus`: estados de cotação, solicitação, motorista, trânsito, entrega, falha e cancelamento.
- `StockMovementType`: `ENTRY`, `SALE`, `RETURN`, `ADJUSTMENT`, `LOSS`.

### Relacionamentos e regras relevantes

- Pedido mantém snapshot do endereço, portanto não depende da alteração posterior do endereço.
- Pedido e item preservam preço/custo no momento da venda.
- `OrderItem`, `StockMovement` e relações históricas restringem exclusão física de produto.
- Carrinho é único por usuário.
- Pagamento e entrega são relações únicas por pedido.
- Há índices para usuário, categoria, marca, status, data, cupom e estoque relacionado.

## 7. Autenticação e autorização

- O backend usa JWT via `@nestjs/passport` e `passport-jwt`.
- O token contém `sub`, `email` e `role`.
- `JwtAuthGuard` autentica e popula `req.user`.
- `RolesGuard` consulta metadata criada por `@Roles`.
- A hierarquia efetiva é `CUSTOMER < ADMIN < OWNER`; uma role exigida aceita roles de nível igual ou superior.
- `CUSTOMER` pode autenticar, gerenciar seus endereços, carrinho, pedidos e pagamentos próprios.
- `ADMIN` gerencia catálogo, operações, pedidos, pagamentos e usuários conforme restrições específicas.
- `OWNER` possui os privilégios de maior nível, inclusive alteração de roles e ImageSearch.
- Produtos/categorias/marcas usam `@Roles(ADMIN)`, que pela hierarquia também permite OWNER.
- ImageSearch usa `@Roles(OWNER)` e é OWNER-only.
- O frontend usa `useAuth` e `AdminShell` para experiência/roteamento, mas não substitui os guards do backend.
- Não existe refresh token implementado, apesar de documentação antiga mencionar esse recurso.

## 8. Integrações externas

### PagBank

- **Finalidade:** criação de checkout PIX e processamento de webhook.
- **Estado:** integração real no `PagBankService` e `PaymentsService`.
- **Frontend:** mostra QR Code, copia e cola e expiração.
- **Limitações:** apenas PIX está habilitado; cartão/boleto não estão disponíveis.
- **Falta:** validar configuração, assinatura/idempotência do webhook e comportamento completo em produção.

### Uber Direct

- **Finalidade:** cotação, criação e acompanhamento de entregas.
- **Estado:** provider e validação de webhook existem.
- **Limitação:** quote/create/status lançam indisponibilidade por falta do contrato atual e credenciais oficiais.
- **Falta:** implementação do contrato real, testes de integração e ativação no checkout.

### 99minutos

- **Finalidade:** cotação, criação, tracking e webhook de entregas.
- **Estado:** provider possui OAuth, chamadas de cotação/criação/status e normalização de webhook.
- **Limitações:** testes exibem falhas simuladas/logadas do provider externo; dependência de ambiente sandbox/produção e configuração operacional.
- **Falta:** validação end-to-end com credenciais e payloads de produção, além de integração do cálculo de frete ao checkout.

### SerpApi

- **Finalidade:** Google Images e Google Autocomplete.
- **Estado:** ImageSearch funcional para OWNER, com cache de autocomplete em memória.
- **Limitações:** depende de quota/chave externa; resultados podem ser URLs de páginas/CDNs e falhar individualmente.
- **Falta:** testes automatizados completos de fallback, quota, timeout e persistência de resultados.

### ViaCEP

- **Finalidade:** autopreenchimento de endereço.
- **Estado:** consumo direto no frontend em conta e checkout, via helper compartilhado.
- **Limitações:** serviço externo client-side; usuário pode editar manualmente se falhar.

### PostgreSQL/Prisma

- **Finalidade:** persistência transacional de usuários, catálogo, estoque, pedidos, pagamentos e entregas.
- **Estado:** integração real via `PrismaService` e migrations.
- **Falta:** procedimento de backup/restauração automatizado documentado para produção.

## 9. Imagens de produtos

### Upload local

1. Frontend seleciona até cinco arquivos de imagem.
2. A primeira é enviada no campo multipart `image`.
3. As restantes são enviadas em `images`.
4. `FileFieldsInterceptor` salva os arquivos em `backend/uploads`.
5. `ProductsService` cria `ProductImage` com posição sequencial.
6. O backend aceita JPEG, PNG, WebP, GIF e AVIF e limita cada arquivo a 5 MB.

### URL

1. Admin informa uma URL.
2. `POST /api/products/upload-url` baixa e grava o arquivo.
3. O frontend recebe uma URL pública relativa.
4. O fluxo de cadastro/edição usa essa imagem como prévia/valor associado.

A validação do endpoint de URL merece revisão: ele verifica URL HTTP/HTTPS, content-type declarado e tamanho, mas não possui a mesma combinação de SSRF/DNS safety e magic bytes do downloader do ImageSearch.

### Colar imagem

- Cadastro e edição escutam `paste` global.
- O primeiro item clipboard com MIME `image/*` é convertido em `File` e usado como prévia.
- O limite local continua sendo 5 MB.

### Busca na internet

1. OWNER informa termo.
2. SerpApi retorna candidatos com título, origem, página, URL original, thumbnail, dimensões e score.
3. Frontend permite selecionar até cinco.
4. Produto é criado/atualizado primeiro.
5. Backend baixa cada URL individualmente.
6. URL original é preferida; thumbnail é fallback quando a original devolve HTML.
7. Downloader valida redirect, host público, MIME, tamanho, HTML e magic bytes.
8. Imagens válidas são gravadas e associadas como `ProductImage`.
9. Resultados falhos retornam domínio/erro por item.
10. Manifesto é gravado com hashes SHA-256 e metadados de origem.

## 10. Painel administrativo

### Dashboard

**Implementado:** `/admin` mostra contagens reais de produtos, categorias, marcas, pedidos, pagamentos, entregas e usuários para OWNER.

**Faltante:** indicadores financeiros, margem, faturamento detalhado, conversão, vendas por período e relatórios, pois o backend não fornece esses agregados.

### Catálogo

**Implementado:** produtos, categorias, marcas, criação, edição, filtros, exclusão protegida/descontinuação e imagens.

**Faltante/revisão:** edição de formulário compartilhado entre novo/editar ainda é duplicada estruturalmente; não há gestão dedicada de estoque/movimentações.

### Vendas

**Implementado:** pedidos, pagamentos e entregas; atualização de status e autorização de entrega.

**Faltante:** fluxo completo de frete no checkout, gestão operacional completa de cancelamentos/reembolsos e integrações Uber ativas.

### Clientes

**Implementado:** usuários, busca, status, roles e exclusão conforme backend.

**Faltante:** histórico consolidado por cliente, detalhes de cliente, segmentação e CRM.

### Marketing

**Implementado:** flags de produto como `featured`, filtros de catálogo e cupons apenas no schema/controller esqueleto.

**Faltante:** cupons funcionais, campanhas, banners administráveis, wishlist e métricas de marketing.

### Conteúdo

**Implementado:** categorias, marcas, imagens de produto, descrições e busca externa de imagens.

**Faltante:** CMS, páginas institucionais reais, reviews funcionais/moderadas e configurações editáveis da loja.

### Desenvolvedor

**Implementado:** `/admin/desenvolvedor/imagens` para OWNER, sugestões, busca e importação de imagens.

**Faltante:** tela de StoreSettings, observabilidade, auditoria de ações, reprocessamento/limpeza de manifestos e gestão de integrações.

## 11. Testes

### Backend

- Existem aproximadamente 9 suites unitárias no código atual.
- A última execução observada passou com **9 suites, 117 testes e 0 falhas**.
- Suites identificadas incluem:
  - `app.controller.spec.ts`;
  - autenticação;
  - endereços;
  - delivery/99minutos;
  - payments;
  - ImageSearch DTO/controller/suggestions.
- Há configuração de `test:e2e`, mas não há evidência de uma cobertura e2e completa dos fluxos de checkout, ImageSearch real e webhooks.
- `npm run build` do backend foi validado.

### Frontend

- Não há suíte automatizada de testes de componentes ou e2e identificada no `package.json`.
- Typecheck `npx tsc --noEmit` foi executado e passou nas últimas validações.
- `npm run build` foi executado e passou.
- `npm run lint` termina sem erros, mas há warnings em scripts temporários `diag-*.mjs` presentes no workspace.

### Gaps de teste importantes

- Remember me/localStorage/sessionStorage.
- ViaCEP com resposta válida, CEP inexistente e falha de rede.
- Criar endereço no checkout e selecionar o endereço retornado.
- Erros 401/403/400/404/500 no checkout.
- Upload multipart com cinco arquivos.
- Remoção/reordenação de ProductImage.
- Importação de cinco imagens, fallback para thumbnail e uma falha sem abortar as outras.
- Webhooks PagBank/99minutos/Uber com assinatura e idempotência.
- Concorrência de estoque na criação de pedido.

## 12. Problemas conhecidos

- Coupons e Reviews são esboços: controllers não repassam argumentos corretamente e não estão integrados ao frontend/checkout.
- StoreSettings existe no schema e é consumido por Delivery, mas não há módulo/controller/página para administrar o registro.
- Checkout usa frete zero e não executa cotação de entrega.
- Uber Direct está desabilitado até confirmação do contrato e credenciais oficiais.
- Pagamento online disponível somente via PIX.
- Não há refresh token apesar de documentação antiga mencionar esse fluxo.
- Alguns documentos em `docs/` estão desatualizados em relação às roles atuais (`CUSTOMER`, `ADMIN`, `OWNER`) e ao hash PBKDF2 usado no código.
- O README do backend/frontend ainda é majoritariamente template e não descreve a arquitetura real.
- O frontend possui duplicação entre formulários novo/editar produto e entre formulários de endereço conta/checkout.
- O endpoint de upload por URL precisa de validação equivalente à do downloader de ImageSearch, principalmente SSRF/DNS e magic bytes.
- Uploads ficam em diretório estático local; não há política de retenção, limpeza de órfãos ou armazenamento externo.
- O relatório de importação por hash corrige associação de resultados, mas arquivos gravados antes de falha posterior podem permanecer órfãos.
- Há warnings de lint em scripts diagnósticos temporários do workspace.
- Não há observabilidade estruturada, tracing ou auditoria completa das ações administrativas.
- CORS está habilitado de forma ampla em `main.ts`; a política de produção deve ser restringida.
- Webhooks são públicos por desenho, mas precisam de validação/monitoramento de assinatura e replay em produção.

## 13. Funcionalidades ainda faltantes

### Crítico para lançar

- Configurar e validar produção do PagBank, webhook e fluxo PIX ponta a ponta.
- Definir política de CORS, HTTPS, secrets e exposição pública no Umbrel.
- Criar/configurar `StoreSettings` para que entrega e retirada tenham origem válida.
- Integrar cotação/frete real ao checkout ou declarar formalmente frete zero para o MVP.
- Corrigir ou desativar formalmente Coupons e Reviews até que seus endpoints não sejam esqueleto.
- Adicionar testes e2e mínimos para login, carrinho, checkout, endereço, pedido e pagamento.
- Revisar segurança do download por URL e limpeza de arquivos órfãos.
- Definir backup e restauração do PostgreSQL e do diretório de uploads.

### Importante

- Implementar StoreSettings administrativo.
- Completar cupons com validação, limites, validade, uso transacional e aplicação no pedido.
- Completar reviews com ownership, aprovação e apresentação na PDP.
- Integrar entrega ao cálculo do pedido e testar 99minutos com credenciais reais.
- Implementar recuperação de senha e, se necessário, refresh token.
- Extrair formulário compartilhado de produto e componente compartilhado de endereço.
- Criar gestão de estoque/movimentos e auditoria administrativa.
- Adicionar testes automatizados de ImageSearch, uploads e ProductImage.

### Futuro

- Wishlist.
- Dashboard financeiro e relatórios.
- CMS/conteúdo institucional.
- Campanhas, banners e automações de marketing.
- Integração completa Uber Direct.
- Armazenamento de imagens em objeto/CDN.
- Observabilidade, métricas e alertas.
- Busca textual/filtros mais avançados e indexação dedicada.

## 14. Riscos técnicos

### Segurança

- JWT fica no storage do navegador; isso reduz complexidade, mas deixa o token exposto a XSS. CSP, sanitização e estratégia de cookies HttpOnly devem ser avaliadas para produção.
- `enableCors()` está amplo; restringir origens e métodos no deploy.
- Endpoints públicos de webhook precisam de validação rigorosa, idempotência, limite de payload e logs sem dados sensíveis.
- Controllers de Coupons/Reviews parecem não ter guards e são incompletos; não devem ser expostos como funcionalidades prontas.
- O downloader ImageSearch tem proteção SSRF, mas o upload por URL de produtos precisa de revisão equivalente.
- Configurações e segredos devem permanecer somente em variáveis de ambiente; nunca registrar valores.

### Dados e estoque

- Criação de pedido possui transação e atualização condicional de estoque, o que é positivo.
- A exigência de `costPrice` para vender pode bloquear produtos cadastrados sem custo.
- Não há testes de concorrência/estoque observados.
- Exclusão física é parcialmente protegida, mas limpeza/retention de imagens órfãs ainda não existe.

### Pagamentos

- Falha de PagBank pode deixar pagamento local FAILED; reprocessamento e reconciliação devem ser definidos.
- Webhook precisa de idempotência e validação de assinatura testadas em produção controlada.
- O cliente permite somente PIX, embora o schema suporte outros métodos.

### Imagens

- URLs externas podem desaparecer, retornar HTML ou bloquear servidores.
- Upload local está em disco do host; perda do volume perde imagens.
- Arquivos podem permanecer sem ProductImage após erro intermediário.
- URLs públicas precisam de backup, limites e eventual CDN.

### Deploy

- `uploads` precisa de volume persistente separado do container.
- Migrations Prisma precisam ser executadas de forma controlada no startup/release.
- Frontend deve conhecer a URL interna/externa correta da API via variável pública.
- Banco, backend, frontend e proxy precisam compartilhar rede e DNS no Umbrel.

## 15. Deploy

Para o Umbrel, o deployment deve ser preparado como pelo menos três serviços persistentes:

1. **PostgreSQL** com volume persistente e backup externo.
2. **Backend NestJS**:
   - instalar dependências;
   - executar `prisma generate`;
   - aplicar migrations com comando controlado;
   - iniciar `node dist/main` após `npm run build`;
   - expor a porta interna do backend;
   - montar volume persistente em `backend/uploads`;
   - fornecer `DATABASE_URL`, JWT/configuração e credenciais de integrações via secrets.
3. **Frontend Next.js**:
   - fornecer `NEXT_PUBLIC_API_URL` apontando para o backend publicado;
   - executar build e `next start` na porta configurada;
   - preservar `.next` apenas dentro do ciclo do container, não como estado de negócio.

Também é necessário:

- reverse proxy com HTTPS;
- domínio/hostname estável para frontend, API e webhooks;
- CORS restrito ao frontend;
- volumes para PostgreSQL e uploads;
- backup periódico do banco e uploads;
- healthchecks de frontend, backend e banco;
- monitoramento de logs sem secrets;
- configuração de URLs de webhook PagBank/99minutos/Uber;
- validação de permissões de filesystem do diretório de uploads;
- estratégia para migrations sem downtime ou com janela controlada.

O projeto não contém atualmente um manifesto Docker/Compose de produção confirmado neste handoff. A documentação `templates/DEPLOY.md` é apenas um template sem procedimento operacional preenchido.

## 16. Próximos passos sugeridos

1. Atualizar a documentação operacional para refletir roles, autenticação e integrações realmente usadas.
2. Configurar `StoreSettings` e validar o ambiente de produção sem expor secrets.
3. Fechar o contrato do checkout: frete zero explícito ou cotação real, seguido de pedido e PagBank.
4. Criar testes e2e do fluxo cliente completo.
5. Revisar segurança de uploads por URL, webhooks, CORS e persistência de arquivos.
6. Completar ou retirar da superfície pública Coupons e Reviews.
7. Implementar a tela de StoreSettings e a gestão de estoque/movimentações.
8. Adicionar testes de ProductImage, ImageSearch, upload múltiplo e falhas parciais.
9. Validar PagBank e 99minutos com sandbox e payloads reais.
10. Preparar Docker/Compose, volumes, migrations, healthchecks e backup para Umbrel.
11. Refatorar formulários duplicados somente depois de estabilizar contratos e testes.
12. Adicionar observabilidade e auditoria para operações administrativas e webhooks.

## 17. Checklist final

- [x] Backend NestJS compila.
- [x] Frontend Next.js compila.
- [x] Backend possui migrations Prisma e conexão PostgreSQL configurada por ambiente.
- [x] JWT e guards de role estão implementados.
- [x] Catálogo público e painel básico de produtos existem.
- [x] Cadastro e edição de produtos existem.
- [x] Carrinho autenticado existe.
- [x] Criação de pedido e decremento transacional de estoque existem.
- [x] PIX PagBank possui criação de checkout e webhook.
- [x] Endereços possuem CRUD protegido.
- [x] ViaCEP é usado em conta e checkout.
- [x] Busca/importação de imagens por OWNER existe.
- [x] Upload local aceita múltiplas imagens pelo contrato atual.
- [x] Testes unitários backend existentes passaram na última execução observada.
- [ ] Testes e2e completos do checkout estão implementados.
- [ ] Coupons estão funcionais e integrados ao pedido.
- [ ] Reviews estão funcionais e integrados à PDP.
- [ ] StoreSettings possui módulo/API/UI administrativa.
- [ ] Cotação de entrega está integrada ao checkout.
- [ ] Uber Direct está operacional.
- [ ] Recuperação/refresh de autenticação está implementado.
- [ ] Backup/restauração de banco e uploads está automatizado.
- [ ] Deploy Umbrel possui manifesto de produção validado.
- [ ] Warnings dos scripts diagnósticos temporários foram removidos ou excluídos do lint.

## 18. Resumo executivo

A Loja é um e-commerce funcional em estágio avançado de MVP.
O catálogo público, filtros, páginas de produto e categorias estão implementados.
O carrinho autenticado usa o backend como autoridade para quantidades e preços.
O checkout cria pedidos com endereço, valida estoque e registra movimentos.
O pagamento online disponível é PIX através do PagBank.
O backend mantém snapshots de preço, custo e endereço no pedido.
Autenticação JWT e autorização por CUSTOMER, ADMIN e OWNER estão implementadas.
O painel administrativo possui catálogo, pedidos, pagamentos, entregas e usuários.
Produtos podem ser criados, editados, descontinuados e associados a múltiplas imagens.
A busca de imagens usa SerpApi e tem validação de URL, MIME e magic bytes.
Falhas individuais de imagem não abortam as demais importações.
ViaCEP está compartilhado entre conta e checkout.
A entrega 99minutos possui integração estrutural, mas exige validação operacional real.
Uber Direct ainda é um provider desabilitado, não uma integração pronta para produção.
Cupons e reviews existem no schema, porém seus módulos são incompletos.
StoreSettings é consumido por entregas, mas não possui administração própria.
O checkout ainda usa frete zero e não integra cotação de entrega.
Não há suíte frontend/e2e abrangente para os fluxos críticos.
Há riscos pendentes em uploads públicos, webhooks, CORS, backups e deploy.
O próximo ciclo deve priorizar segurança, testes de checkout, StoreSettings e produção.
