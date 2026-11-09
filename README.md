<div align="center">

# LOJA

### Plataforma de gestão comercial e loja virtual

Catálogo de produtos, controle de estoque, registro de vendas e administração interna em uma base preparada para evoluir para o comércio eletrônico público.

<p>
  <img src="https://img.shields.io/badge/estágio-em%20desenvolvimento-f59e0b?style=flat-square" alt="Estágio: em desenvolvimento">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-2f6792?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL e Prisma">
</p>

</div>

> **Posicionamento atual:** a primeira etapa do projeto é operacional. O sistema está sendo preparado para organizar o catálogo, administrar produtos e estoque e registrar as vendas da loja antes da liberação da compra remota ao público.

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Primeira etapa: operação da loja](#primeira-etapa-operação-da-loja)
- [Etapa futura: comércio eletrônico](#etapa-futura-comércio-eletrônico)
- [Funcionalidades disponíveis](#funcionalidades-disponíveis)
- [Arquitetura e tecnologias](#arquitetura-e-tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Instalação local](#instalação-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Segurança e observações](#segurança-e-observações)
- [Roadmap](#roadmap)
- [Documentação complementar](#documentação-complementar)

## Sobre o projeto

LOJA é uma plataforma full-stack para apoiar a operação comercial de uma loja física e, em uma etapa posterior, disponibilizar uma experiência de comércio eletrônico.

O repositório reúne:

- uma API em NestJS com PostgreSQL e Prisma;
- um painel administrativo em Next.js;
- uma vitrine pública com catálogo, categorias, produto e carrinho;
- autenticação, autorização por papéis e módulos de pedidos, pagamentos, entregas e frete.

O projeto permanece em desenvolvimento. A existência de uma tela ou integração no código não significa, por si só, que o fluxo esteja homologado ou pronto para produção.

## Primeira etapa: operação da loja

O primeiro lançamento prioriza o uso interno como ferramenta de gestão:

- organização do catálogo;
- cadastro, edição, listagem e desativação de produtos;
- administração de categorias e marcas;
- controle de estoque por produto;
- histórico de movimentações de estoque gerado pelos fluxos existentes;
- registro e acompanhamento de pedidos e vendas;
- administração interna de usuários, pedidos, pagamentos e entregas, conforme permissões;
- autenticação e controle de acesso para as áreas administrativas.

## Etapa futura: comércio eletrônico

Os próximos passos são tratados como evolução do produto, não como disponibilidade garantida no lançamento operacional:

- liberação pública de compra remota;
- checkout completo e validação dos fluxos de ponta a ponta;
- ampliação e homologação das integrações de pagamento e logística;
- automações operacionais, relatórios e melhorias adicionais.

## Funcionalidades disponíveis

### Painel administrativo

Rotas administrativas presentes no frontend:

- `/admin/dashboard` — visão geral da operação;
- `/admin/produtos` — listagem, filtros, seleção e ações sobre produtos;
- `/admin/produtos/novo` — cadastro;
- `/admin/produtos/[id]/editar` — edição;
- `/admin/produtos/importar` — análise e importação no formato aceito pelo parser atual;
- `/admin/categorias` e `/admin/marcas` — gestão do catálogo;
- `/admin/pedidos`, `/admin/pagamentos` e `/admin/entregas`;
- `/admin/usuarios`;
- `/admin/desenvolvedor/imagens` — área restrita para busca de imagens.

O acesso administrativo é protegido no frontend e no backend. Os papéis existentes no código são `CUSTOMER`, `ADMIN` e `OWNER`, com regras de acesso específicas por módulo.

### Catálogo e estoque

- produtos com SKU, slug, preço, preço comparativo, custo opcional, estoque, situação, destaque e associação a categoria/marca;
- upload e gerenciamento de imagens de produtos;
- filtros por busca, categoria, marca, preço, situação e estoque;
- ajustes de estoque registrados como movimentações no backend;
- preservação do histórico que impede a exclusão de produtos vinculados a operações existentes.

> O custo do produto é um dado administrativo. As consultas públicas não o expõem, e a importação em lote atual não possui campo de `costPrice`.

### Vitrine e conta

Existem rotas públicas para:

- página inicial;
- catálogo e filtros;
- categorias;
- detalhes do produto;
- carrinho;
- login e cadastro;
- conta, pedidos e checkout.

Essas telas fazem parte da base do produto, mas a liberação comercial pública depende da validação dos fluxos, integrações e requisitos operacionais.

### Integrações presentes no código

- autenticação JWT e login com Google;
- PagBank para fluxo de pagamento online e webhook;
- cálculo de frete com SuperFrete, com fallback configurável;
- módulos de entrega para 99minutos/99Entrega e Uber Direct, sujeitos a credenciais, contrato e configuração;
- notificações via Meta WhatsApp Cloud API, quando configuradas;
- reCAPTCHA v3 opcional;
- busca administrativa de imagens, restrita ao papel autorizado.

Integrações dependentes de credenciais ou homologação não devem ser consideradas ativas apenas por estarem implementadas no código.

## Arquitetura e tecnologias

| Camada | Tecnologia | Local |
| --- | --- | --- |
| API | NestJS 11, TypeScript, Express | `backend/` |
| Persistência | PostgreSQL, Prisma 6 | `backend/prisma/` |
| Interface | Next.js 16, React 19, TypeScript | `frontend/` |
| Estilos | Tailwind CSS 4 | `frontend/` |
| Autenticação | JWT, Passport e Google OAuth | `backend/src/modules/auth/` |
| Validação | `class-validator`, `class-transformer` e Joi | backend |

O backend expõe a API sob o prefixo `/api`. No desenvolvimento local, a configuração padrão usa a porta `3000` para a API e `3001` para o frontend.

## Estrutura do projeto

```text
.
├── backend/
│   ├── prisma/             # Schema e migrations do Prisma
│   ├── src/
│   │   ├── common/         # Guards, decorators e estratégias
│   │   ├── config/         # Configuração da aplicação
│   │   └── modules/        # Auth, produtos, pedidos, pagamentos etc.
│   └── .env.example        # Modelo de configuração local
├── frontend/
│   ├── public/              # Assets públicos
│   └── src/
│       ├── app/             # Rotas Next.js
│       ├── components/      # Componentes compartilhados
│       ├── hooks/           # Hooks de aplicação
│       └── lib/             # API, autenticação e tipos
├── branding/                # Identidade visual e referências
├── docs/                    # Regras, arquitetura, API e roadmap
└── README.md
```

## Requisitos

- Node.js compatível com as versões utilizadas pelos projetos;
- npm;
- PostgreSQL local ou outro banco autorizado para desenvolvimento;
- credenciais somente para as integrações que forem testadas.

Não há um `package.json` na raiz: backend e frontend possuem instalação e scripts próprios.

## Instalação local

### 1. Backend

Em um terminal:

```bash
cd backend
npm install
```

Crie `backend/.env` a partir de `backend/.env.example` e preencha apenas os valores necessários para o ambiente local. Gere o cliente Prisma:

```bash
npx prisma generate
```

Inicie a API em modo de desenvolvimento:

```bash
npm run start:dev
```

A API ficará disponível em `http://localhost:3000/api`.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend ficará disponível em `http://localhost:3001`.

> Este README não executa nem prescreve migrations, seeds ou scripts de limpeza automaticamente. A preparação do banco deve seguir o procedimento controlado do ambiente de desenvolvimento.

## Variáveis de ambiente

O modelo completo está em [`backend/.env.example`](./backend/.env.example). Entre as configurações previstas estão:

- `DATABASE_URL` — conexão PostgreSQL;
- `JWT_SECRET` e `JWT_EXPIRES_IN` — autenticação;
- `PORT`, `HOST`, `APP_URL` e `CORS_ORIGIN` — servidor e comunicação;
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — login com Google;
- `PAGBANK_*` — pagamento online e webhook;
- `SUPERFRETE_*` e `SHIPMENT_ORIGIN_ZIPCODE` — cálculo de frete;
- `META_WA_*` — notificações WhatsApp;
- `NINENINE_*` e `UBER_*` — entregas;
- `RECAPTCHA_SECRET_KEY` — proteção opcional;
- `IMAGE_BOT_*` — limites da busca de imagens.

Nunca versionar `backend/.env`, tokens, senhas, chaves privadas ou credenciais de terceiros.

## Segurança e observações

- O backend aplica autenticação JWT, autorização por papéis, validação de payloads e limitação global de requisições.
- Dados financeiros e custos devem permanecer restritos às permissões definidas no backend.
- Webhooks e integrações externas exigem configuração de segredos e validação própria.
- O fallback de frete não substitui a homologação de uma transportadora.
- O projeto não é declarado pronto para produção neste documento. Ainda são necessárias validações operacionais, de segurança, infraestrutura, backup e observabilidade.
- Não use credenciais reais em testes locais sem autorização e sem confirmar o ambiente do banco.

## Roadmap

1. Consolidar a operação interna de catálogo, estoque e vendas.
2. Validar os fluxos administrativos e os papéis `ADMIN` e `OWNER`.
3. Homologar pagamentos, fretes, entregas e notificações conforme necessidade.
4. Validar checkout e compra remota de ponta a ponta.
5. Planejar a liberação pública e a infraestrutura de produção.
6. Evoluir relatórios, automações e integrações.

## Documentação complementar

- [Regras do projeto](./docs/PROJECT_RULES.md)
- [Regras de negócio](./docs/BUSINESS_RULES.md)
- [Arquitetura do sistema](./docs/SYSTEM_ARCHITECTURE.md)
- [Documentação da API](./docs/API.md)
- [Banco de dados](./docs/DATABASE.md)
- [Segurança](./docs/SECURITY.md)
- [Guia de interface](./docs/UI_GUIDE.md)
- [Roadmap detalhado](./docs/ROADMAP.md)
- [Guia de marca](./branding/BRAND_GUIDE.md)

## Créditos e licença

Não há uma licença de código aberto confirmada na raiz do repositório. Até que uma licença seja definida, o uso, a redistribuição e a publicação do código devem ser tratados conforme a autorização dos responsáveis pelo projeto.
